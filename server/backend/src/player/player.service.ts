import { join as path_join } from "path";
import { spawn as cp_spawn } from "child_process";
import { Readable } from "stream";
import * as fs from "fs";

import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import parseTorrent from "parse-torrent";
import ffmpeg_static from "ffmpeg-static";
import { path as ffprobe_static } from "ffprobe-static";

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

    const files = await this.torrentService.listFiles({ magnet });
    const file = files.find((file) => file.name === name && file.path === path);
    if (!file)
      throw new HttpException(
        `File ${path_join(path, name)} not found in ${magnetUri.infoHash}`,
        HttpStatus.NOT_FOUND,
      );

    const fullpath = path_join(TORRENT_PATH, magnetUri.infoHash, path, name);

    if (await fileExists(fullpath + "__subtitles.json")) {
      Logger(`Player`).log(
        `${magnetUri.infoHash} ${fullpath} serving subtitles tracks`,
      );
      return JSON.parse(
        (await fs.promises.readFile(fullpath + "__subtitles.json")).toString(),
      );
    }

    Logger(`Player`).log(
      `${magnetUri.infoHash} ${fullpath} extracting subtitles tracks`,
    );
    const tracks: { label: string; srclang: string; index: number }[] = (
      await new Promise<any[]>((resolve, reject) => {
        const spawn = cp_spawn(
          ffprobe_static,
          ["-show_streams", "-print_format", "json", "-i", "-"],
          {
            stdio: ["pipe", "pipe", "ignore"],
          },
        );

        this.torrentService
          .downloadFile({ magnet, name, path })
          .then((stream) => stream.pipe(spawn.stdin));

        let out = "";
        spawn.stdout.on("data", (buffer: Buffer) => (out += buffer.toString()));
        spawn.stdin.once("error", () => {});
        spawn
          .once("error", (err) => reject(err))
          .once("close", () => resolve(JSON.parse(out).streams));
      })
    )
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

    return new Promise<{ label: string; srclang: string; index: number }[]>(
      (resolve, reject) => {
        const tag = Date.now();

        const spawn = cp_spawn(
          ffmpeg_static,
          [
            "-y",
            "-i",
            "-",
            ...tracks.reduce(
              (a, { index }) => [
                ...a,
                `-map`,
                `0:${index}`,
                `-c:${index}`,
                `webvtt`,
                `-f`,
                `webvtt`,
                fullpath + "__subtitle_" + index + ".vtt_" + tag,
              ],
              [],
            ),
          ],
          {
            stdio: ["pipe", "ignore", "ignore"],
          },
        );

        this.torrentService
          .downloadFile({ magnet, name, path })
          .then((stream) => stream.pipe(spawn.stdin));

        spawn.stdin.once("error", () => {});
        spawn.once("exit", async (code) => {
          if (code === 0)
            await Promise.all(
              tracks.map(({ index }) =>
                fs.promises.copyFile(
                  fullpath + "__subtitle_" + index + ".vtt_" + tag,
                  fullpath + "__subtitle_" + index + ".vtt",
                ),
              ),
            );
          await Promise.all(
            tracks.map(({ index }) =>
              fs.promises
                .rm(fullpath + "__subtitle_" + index + ".vtt_" + tag)
                .catch(() => {}),
            ),
          );

          if (code !== 0) {
            Logger(`Player`).warn(
              `${magnetUri.infoHash} ${fullpath} failed extracting subtitles tracks with code ${code}`,
            );
            return reject(new Error(`Exit code ${code}`));
          }

          Logger(`Player`).log(
            `${magnetUri.infoHash} ${fullpath} done extracting subtitles tracks`,
          );
          return resolve(tracks);
        });
      },
    );
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
          "-",
          `-map`,
          `0:${sub.index}`,
          `-c:${sub.index}`,
          `webvtt`,
          `-f`,
          `webvtt`,
          `pipe:1`,
        ],
        {
          stdio: ["pipe", "pipe", "ignore"],
        },
      );

      this.torrentService
        .downloadFile({ magnet, name, path })
        .then((stream) => stream.pipe(spawn.stdin));

      const tmpfile =
        fullpath + "__subtitle_" + sub.index + ".vtt_" + Date.now();

      const stream = fs.createWriteStream(tmpfile);
      spawn.stdout.on("data", (buffer: Buffer) => stream.write(buffer));
      spawn.stdin.once("error", () => {});
      spawn.once("exit", async (code) => {
        stream.close();
        if (code === 0)
          await fs.promises.copyFile(
            tmpfile,
            fullpath + "__subtitle_" + sub.index + ".vtt",
          );
        await fs.promises.rm(tmpfile);

        if (code !== 0)
          Logger(`Player`).log(
            `${magnetUri.infoHash} ${fullpath} done extracting subtitles track ${index}`,
          );
        else
          Logger(`Player`).warn(
            `${magnetUri.infoHash} ${fullpath} failed extracting subtitles track ${index} with code ${code}`,
          );
      });

      resolve(spawn.stdout);
    });
  }
}
