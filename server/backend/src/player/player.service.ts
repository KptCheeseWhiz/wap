import { join as path_join } from "path";
import { spawn as cp_spawn } from "child_process";
import { Readable } from "stream";
import * as fs from "fs";

import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import parseTorrent from "parse-torrent";
import ffmpeg_static from "ffmpeg-static";
import { path as ffprobe_static } from "ffprobe-static";

import { GetSubtitlesDto } from "./dto/getSubtitles.dto";
import { ListSubtitlesDto } from "./dto/listSubtitles.dto";

import { TorrentService } from "@/torrent/torrent.service";
import { fileExists } from "@/common/utils.helper";

const TORRENT_PATH = process.env.TORRENT_PATH || "./torrents";

@Injectable()
export class PlayerService {
  constructor(private torrentService: TorrentService) {
    fileExists(ffmpeg_static).then(
      (exists) => !exists && require("ffmpeg-static/install"),
    );
  }

  async listSubtitles({
    magnet,
    name,
    path,
  }: ListSubtitlesDto): Promise<{ title: string; language: string }[]> {
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

    if (await fileExists(fullpath + "__subtitles.json"))
      return JSON.parse(
        (await fs.promises.readFile(fullpath + "__subtitles.json")).toString(),
      ).map(({ title, language }) => ({ title, language }));

    const tracks = (
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
      .filter(
        (stream) =>
          (stream.codec_type as typeof stream.codec_name & "subtitle") ===
          "subtitle",
      )
      .map((sub) => ({
        title: sub.tags.title,
        language: sub.tags.language,
        index: sub.index,
      }));

    await fs.promises.writeFile(
      fullpath + "__subtitles.json",
      JSON.stringify(tracks),
    );
    return tracks.map(({ title, language }) => ({ title, language }));
  }

  async getSubtitle({
    magnet,
    name,
    path,
    index,
  }: GetSubtitlesDto): Promise<Readable> {
    const magnetUri = parseTorrent(magnet);
    if (!magnetUri)
      throw new HttpException("Invalid magnet", HttpStatus.BAD_REQUEST);

    const fullpath = path_join(TORRENT_PATH, magnetUri.infoHash, path, name);

    if (!(await fileExists(fullpath + "__subtitles.json")))
      throw new HttpException(
        "List the subtitles before fetching one",
        HttpStatus.NOT_ACCEPTABLE,
      );

    if (await fileExists(fullpath + "__subtitle_" + +index + ".vtt"))
      return fs.createReadStream(fullpath + "__subtitle_" + +index + ".vtt");

    const subs: {
      title: string;
      language: string;
      index: number;
    }[] = JSON.parse(
      (await fs.promises.readFile(fullpath + "__subtitles.json")).toString(),
    );

    const sub = subs[+index];
    if (!sub)
      throw new HttpException("Subtitle not found", HttpStatus.NOT_FOUND);

    return new Promise<Readable>((resolve) => {
      const tmpfile = fullpath + "__subtitle_" + +index + ".vtt_" + Date.now();

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
          tmpfile,
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
          await fs.promises.copyFile(
            tmpfile,
            fullpath + "__subtitle_" + +index + ".vtt",
          );
        await fs.promises.rm(tmpfile);
      });

      resolve(spawn.stdout);
    });
  }
}
