import { join as path_join } from "path";
import { spawn as cp_spawn } from "child_process";
import { Readable } from "stream";
import * as fs from "fs";

import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import parseTorrent from "parse-torrent";
import ffmpeg_static from "ffmpeg-static";
import { path as ffprobe_static } from "ffprobe-static";

import { GetFFProbeDto } from "./dto/getFFProbe.dto";
import { GetSubtitleDto } from "./dto/getSubtitle.dto";
import { GetSubtitlesDto } from "./dto/getSubtitles.dto";

import { TorrentService } from "@/torrent/torrent.service";
import { fileExists } from "@/common/utils.helper";
import Logger from "@/common/logger.helper";

const TORRENT_PATH = process.env.TORRENT_PATH || "./torrents";

@Injectable()
export class PlayerService {
  constructor(private torrentService: TorrentService) {
    fileExists(ffmpeg_static).then(
      (exists) => !exists && require("ffmpeg-static/install"),
    );
  }

  async ffprobe({ magnet, name, path }: GetFFProbeDto): Promise<
    {
      index: number;
      codec_name: string;
      codec_long_name: string;
      codec_type: string;
      codec_time_base: string;
      codec_tag_string: string;
      codec_tag: string;
      disposition: any;
      tags: any;
      [key: string]: any;
    }[]
  > {
    const magnetUri = parseTorrent(magnet);
    if (!magnetUri)
      throw new HttpException("Invalid magnet", HttpStatus.BAD_REQUEST);

    const fullpath = path_join(TORRENT_PATH, magnetUri.infoHash, path, name);
    if (await fileExists(fullpath + "__ffprobe.json"))
      return JSON.parse(
        (await fs.promises.readFile(fullpath + "__ffprobe.json")).toString(),
      );

    const files = await this.torrentService.listFiles({ magnet });
    const file = files.find((file) => file.name === name && file.path === path);
    if (!file)
      throw new HttpException(
        `File ${path_join(path, name)} not found in ${magnetUri.infoHash}`,
        HttpStatus.NOT_FOUND,
      );

    if (file.mime.indexOf("video/") !== 0)
      throw new HttpException(
        `File ${path_join(path, name)} is not a video`,
        HttpStatus.NOT_ACCEPTABLE,
      );

    await this.torrentService.waitDone({ magnet, name, path });

    const streams: any[] = await new Promise<any[]>((resolve, reject) => {
      const spawn = cp_spawn(
        ffprobe_static,
        ["-show_streams", "-print_format", "json", "-i", fullpath],
        {
          stdio: ["ignore", "pipe", "ignore"],
        },
      );

      let out = "";
      spawn.stdout.on("data", (buffer: Buffer) => (out += buffer.toString()));
      spawn
        .once("error", (err) => reject(err))
        .once("close", () => resolve(JSON.parse(out).streams));
    });

    await fs.promises.writeFile(
      fullpath + "__ffprobe.json",
      JSON.stringify(streams),
    );

    return streams;
  }

  async getSubtitles({
    magnet,
    name,
    path,
  }: GetSubtitlesDto): Promise<
    { label: string; srclang: string; index: number }[]
  > {
    const magnetUri = parseTorrent(magnet);
    if (!magnetUri)
      throw new HttpException("Invalid magnet", HttpStatus.BAD_REQUEST);

    const fullpath = path_join(TORRENT_PATH, magnetUri.infoHash, path, name);
    if (await fileExists(fullpath + "__subtitles.json")) {
      Logger(`Player`).log(
        `${magnetUri.infoHash} ${fullpath} serving subtitles tracks`,
      );
      return JSON.parse(
        (await fs.promises.readFile(fullpath + "__subtitles.json")).toString(),
      );
    }

    const files = await this.torrentService.listFiles({ magnet });
    const file = files.find((file) => file.name === name && file.path === path);
    if (!file)
      throw new HttpException(
        `File ${path_join(path, name)} not found in ${magnetUri.infoHash}`,
        HttpStatus.NOT_FOUND,
      );

    if (file.mime.indexOf("video/") !== 0)
      throw new HttpException(
        `File ${path_join(path, name)} is not a video`,
        HttpStatus.NOT_ACCEPTABLE,
      );

    Logger(`Player`).log(
      `${magnetUri.infoHash} ${fullpath} extracting subtitles tracks`,
    );

    const streams = await this.ffprobe({ magnet, name, path });
    const tracks: { label: string; srclang: string; index: number }[] = streams
      .filter((stream) => stream.codec_type === "subtitle")
      .map((sub) => ({
        label: sub.tags.title || sub.tags.language || `label_${sub.index}`,
        srclang: sub.tags.language || `srclang_${sub.index}`,
        index: sub.index,
      }));
    Logger(`Player`).log(
      `${magnetUri.infoHash} ${fullpath} found ${tracks.length} subtitles tracks`,
    );

    await fs.promises.writeFile(
      fullpath + "__subtitles.json",
      JSON.stringify(tracks),
    );

    return tracks;
  }

  async getSubtitle({
    magnet,
    name,
    path,
    index,
  }: GetSubtitleDto): Promise<Readable> {
    const magnetUri = parseTorrent(magnet);
    if (!magnetUri)
      throw new HttpException("Invalid magnet", HttpStatus.BAD_REQUEST);

    const fullpath = path_join(TORRENT_PATH, magnetUri.infoHash, path, name);

    if (!(await fileExists(fullpath + "__subtitles.json")))
      throw new HttpException(
        "List the subtitles before fetching one",
        HttpStatus.NOT_ACCEPTABLE,
      );

    if (await fileExists(fullpath + "__subtitle_" + +index + ".vtt")) {
      Logger(`Player`).log(
        `${magnetUri.infoHash} ${fullpath} serving subtitles track ${index}`,
      );
      return fs.createReadStream(fullpath + "__subtitle_" + +index + ".vtt");
    }

    const subs: {
      label: string;
      srclang: string;
      index: number;
    }[] = JSON.parse(
      (await fs.promises.readFile(fullpath + "__subtitles.json")).toString(),
    );

    const sub = subs.find((sub) => sub.index === +index);
    if (!sub)
      throw new HttpException("Subtitle not found", HttpStatus.NOT_FOUND);

    Logger(`Player`).log(
      `${magnetUri.infoHash} ${fullpath} extracting subtitles track ${index}`,
    );
    return new Promise<Readable>((resolve) => {
      const spawn = cp_spawn(
        ffmpeg_static,
        [
          "-y",
          "-i",
          fullpath,
          `-map`,
          `0:${sub.index}`,
          `-c:${sub.index}`,
          `webvtt`,
          `-f`,
          `webvtt`,
          `pipe:1`,
        ],
        {
          stdio: ["ignore", "pipe", "ignore"],
        },
      );

      const tmpfile =
        fullpath + "__subtitle_" + sub.index + ".vtt_" + Date.now();

      const stream = fs.createWriteStream(tmpfile);
      spawn.stdout.on("data", (buffer: Buffer) => stream.write(buffer));
      spawn.once("exit", async (code) => {
        stream.close();
        if (code === 0) {
          Logger(`Player`).log(
            `${magnetUri.infoHash} ${fullpath} done extracting subtitles track ${index}`,
          );
          await fs.promises.copyFile(
            tmpfile,
            fullpath + "__subtitle_" + sub.index + ".vtt",
          );
        } else
          Logger(`Player`).warn(
            `${magnetUri.infoHash} ${fullpath} failed extracting subtitles track ${index} with code ${code}`,
          );
        await fs.promises.rm(tmpfile);
      });

      resolve(spawn.stdout);
    });
  }
}
