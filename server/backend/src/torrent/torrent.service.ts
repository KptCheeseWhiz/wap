import { Worker, MessageChannel, MessagePort } from "worker_threads";
import { cpus as os_cpus } from "os";
import { join as path_join } from "path";
import { Readable } from "stream";
import * as fs from "fs";

import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import * as parseTorrent from "parse-torrent";

import { DownloadFileDto } from "./dto/downloadFile.dto";
import { DownloadPlaylistDto } from "./dto/downloadPlaylist.dto";
import { ListFilesDto } from "./dto/listFiles.dto";

import PortHelper from "@/common/port.helper";
import { LockingReadable } from "@/common/chunked.helper";
import Logger, { Context } from "@/common/logger.helper";
import { fileExists, testFolder } from "@/common/utils.helper";

let workerCount = 0;
class TorrentWorkerBridge {
  private _id: string = `${Context.TORRENT} ${workerCount++}`;

  private _worker: Worker;
  private _mainPort: PortHelper;
  private _hashes: { [key: string]: boolean } = {};

  constructor(ready_callback?: () => void) {
    this.init().then(() => ready_callback());
  }

  private async init() {
    const { port1, port2 } = new MessageChannel();

    this._worker = new Worker(path_join(__dirname, "./torrent.worker.js"), {
      env: process.env,
      workerData: {
        port: port1,
        id: this._id,
      },
      transferList: [port1],
    })
      .on("error", (err: Error) =>
        Logger(this._id).log(`caught error ${err.message}`),
      )
      .once("exit", async (code: number) => {
        Logger(this._id).log(`exited with code ${code}`);
        if (code !== 0) {
          await this.init();
          for (let infoHash of Object.keys(this._hashes))
            await this.resume({ infoHash });
        }
      });

    this._mainPort = new PortHelper(port2);
    await this._mainPort.wait<void>("ready");
  }

  get hashes(): string[] {
    return Object.keys(this._hashes);
  }

  has(infoHash: string): boolean {
    return !!this._hashes[infoHash];
  }

  async drop({ infoHash }: { infoHash: string }) {
    return await this._mainPort
      .send<void>("drop", { infoHash })
      .then(() => {
        delete this._hashes[infoHash];
      });
  }

  async remove({
    infoHash,
    force,
  }: {
    infoHash: string;
    force: boolean;
  }): Promise<void> {
    return await this._mainPort
      .send<void>("remove", { infoHash, force })
      .then(() => {
        delete this._hashes[infoHash];
      });
  }

  async resume({ infoHash }: { infoHash: string }): Promise<boolean> {
    return await this._mainPort
      .send<boolean>("resume", { infoHash })
      .then((ok) => {
        if (ok) this._hashes[infoHash] = true;
        return ok;
      });
  }

  async files({
    magnet,
  }: {
    magnet: string;
  }): Promise<{ name: string; size: number }[]> {
    return await this._mainPort.send<{ name: string; size: number }[]>(
      "files",
      {
        magnet,
      },
    );
  }

  async download({
    magnet,
    filename,
    start,
    end,
  }: {
    magnet: string;
    filename: string;
    start: number;
    end: number;
  }): Promise<{
    stream: Readable;
    mime: string;
    length: number;
    path: string;
    infoHash: string;
  }> {
    const { port, mime, length, path, infoHash } = await this._mainPort.send<{
      port: MessagePort;
      mime: string;
      length: number;
      path: string;
      infoHash: string;
    }>("download", {
      magnet,
      filename,
      start,
      end,
    });

    if (!this._hashes[infoHash]) this._hashes[infoHash] = true;

    const dlport = new PortHelper(port);

    const stream = new LockingReadable();
    dlport.recv(
      "write",
      async ({
        buffer,
        offset,
      }: {
        buffer: Uint8Array;
        index: number;
        offset: number;
      }) => {
        if (stream.destroyed) return true;
        await stream.set(Buffer.from(buffer));
        if (offset + buffer.length >= (end || length)) await stream.end();
      },
    );
    stream.on("close", () => dlport.close());

    return {
      stream,
      infoHash,
      length,
      mime,
      path,
    };
  }

  async load(): Promise<number> {
    return await this._mainPort.send<number>("load");
  }

  async status() {
    return {
      _id: this._id,
      ...(await this._mainPort.send<any>("status")),
    };
  }

  async terminate() {
    return await this._worker.terminate();
  }
}

@Injectable()
export class TorrentService {
  private _workers: TorrentWorkerBridge[] = [];
  private _ready = false;

  private _TORRENT_MAX_WORKERS: number;
  private _TORRENT_PATH: string;

  constructor() {
    this._TORRENT_MAX_WORKERS = Math.max(
      +process.env.TORRENT_MAX_WORKERS || os_cpus().length,
      2,
    );
    this._TORRENT_PATH = process.env.TORRENT_PATH || "./torrents";

    testFolder(this._TORRENT_PATH).then((ok) => {
      if (!ok)
        throw new Error(
          `Unable to access ${this._TORRENT_PATH}, please check folder permissions`,
        );

      let onlineWorker = 0;
      for (let i = 0; i < this._TORRENT_MAX_WORKERS; ++i)
        this._workers.push(
          new TorrentWorkerBridge(() => {
            if (++onlineWorker === this._TORRENT_MAX_WORKERS)
              this.rescan().then(() => (this._ready = true));
          }),
        );
    });
  }

  private async rescan() {
    if (!(await fileExists(this._TORRENT_PATH))) return;
    return Promise.all(
      (
        await fs.promises.readdir(this._TORRENT_PATH, {
          withFileTypes: true,
        })
      )
        .filter((file) => file.isDirectory())
        .map(async (directory, i) => {
          const fmagnet = path_join(
            this._TORRENT_PATH,
            directory.name + ".magnet",
          );
          if (!(await fileExists(fmagnet))) return;

          const magnet = (await fs.promises.readFile(fmagnet)).toString();
          const magnetUri = parseTorrent(magnet);
          if (!magnetUri.infoHash) return;

          await this._workers[i % this._workers.length].resume({
            infoHash: magnetUri.infoHash,
          });
        }),
    );
  }

  private async findBest(infoHash: string): Promise<TorrentWorkerBridge> {
    const workers = this._workers.filter((w) => w.has(infoHash));
    if (workers.length === 0)
      return (
        await Promise.all(
          this._workers.map(async (w) => ({
            worker: w,
            load: await w.load(),
          })),
        )
      ).sort((a, b) => a.load - b.load)[0].worker;
    while (workers.length !== 1) await workers.pop().drop({ infoHash });
    return workers[0];
  }

  async listFiles({
    magnet,
  }: ListFilesDto): Promise<{ name: string; size: number }[]> {
    const magnetUri = parseTorrent(magnet);
    if (!magnetUri)
      throw new HttpException("Invalid magnet", HttpStatus.BAD_REQUEST);
    return (await this.findBest(magnetUri.infoHash)).files({ magnet });
  }

  async downloadFile({
    magnet,
    filename,
    start,
    end,
  }: DownloadFileDto & { start: number; end: number }): Promise<{
    stream: Readable;
    mime: string;
    length: number;
    path: string;
    infoHash: string;
  }> {
    if (!this._ready)
      throw new HttpException(
        "Please wait while workers are launching",
        HttpStatus.SERVICE_UNAVAILABLE,
      );

    const magnetUri = parseTorrent(magnet);
    if (!magnetUri)
      throw new HttpException("Invalid magnet", HttpStatus.BAD_REQUEST);
    return (await this.findBest(magnetUri.infoHash)).download({
      magnet,
      filename,
      start,
      end,
    });
  }

  async downloadPlaylist(
    { magnet, filename, sig }: DownloadPlaylistDto,
    options: { proto: string; host: string },
  ): Promise<{ filename: string; content: string }> {
    const magnetUri = parseTorrent(magnet);
    if (!magnetUri)
      throw new HttpException("Invalid magnet", HttpStatus.BAD_REQUEST);

    const files = await this.listFiles({ magnet, sig });

    if (filename && files.findIndex((file) => file.name === filename) !== -1)
      while (files[0].name !== filename)
        files.push(files.shift() as typeof files[0]);

    return {
      filename: magnetUri.infoHash + ".m3u8",
      content: [
        ...files.reduce(
          (acc, file) => [
            ...acc,
            "",
            "#EXTINF:-1," + file.name,
            options.proto +
              "://" +
              options.host +
              "/api/torrent/download?payload=" +
              Buffer.from(
                JSON.stringify({
                  magnet,
                  filename: file.name,
                  sig,
                }),
              ).toString("base64"),
          ],
          ["#EXTM3U"],
        ),
        "",
      ].join("\n"),
    };
  }

  async status() {
    return await Promise.all(this._workers.map((w) => w.status()));
  }
}
