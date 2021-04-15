import { Worker, MessageChannel, MessagePort } from "worker_threads";
import { cpus as os_cpus } from "os";
import { join as path_join } from "path";
import { Readable } from "stream";
import * as fs from "fs";

import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import parseTorrent, { Instance } from "parse-torrent";

import { DownloadFileDto } from "./dto/downloadFile.dto";
import { DownloadPlaylistDto } from "./dto/downloadPlaylist.dto";
import { ListFilesDto } from "./dto/listFiles.dto";

import PortHelper from "@/common/port.helper";
import { LockingReadable } from "@/common/chunked.helper";
import Logger, { Context } from "@/common/logger.helper";
import {
  chopArray,
  fileExists,
  testFolder,
  toURL,
} from "@/common/utils.helper";
import { CryptoService } from "@/crypto/crypto.service";

const TORRENT_MAX_WORKERS = Math.max(
  +process.env.TORRENT_MAX_WORKERS || os_cpus().length,
  2,
);
const TORRENT_PATH = process.env.TORRENT_PATH || "./torrents";

interface MagnetUri extends Instance {
  infoHash: string;
}

let workerCount = 0;
class TorrentWorkerBridge {
  private _id: string = `${Context.TORRENT} ${workerCount++}`;

  private _worker: Worker;
  private _mainPort: PortHelper;
  private _magnetUris: { [infoHash: string]: MagnetUri } = {};

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
          for (let magnetUri of Object.values(this._magnetUris))
            await this.resume({ magnetUri });
        }
      });

    this._mainPort = new PortHelper(port2);
    this._mainPort.recv("expire", ({ infoHash }: { infoHash: string }) => {
      delete this._magnetUris[infoHash];
    });
    await this._mainPort.wait<void>("ready");
  }

  get hashes(): string[] {
    return Object.keys(this._magnetUris);
  }

  has(infoHash: string): boolean {
    return !!this._magnetUris[infoHash];
  }

  async done({
    magnetUri,
    name,
    path,
  }: {
    magnetUri: MagnetUri;
    name?: string;
    path?: string;
  }) {
    return await this._mainPort.send<void>("done", { magnetUri, name, path });
  }

  async download({
    magnetUri,
    name,
    path,
    start,
    end,
  }: {
    magnetUri: MagnetUri;
    name: string;
    path: string;
    start: number;
    end: number;
  }): Promise<Readable> {
    const { port, length } = await this._mainPort.send<{
      port: MessagePort;
      length: number;
    }>("download", {
      magnetUri,
      name,
      path,
      start,
      end,
    });

    if (!this._magnetUris[magnetUri.infoHash])
      this._magnetUris[magnetUri.infoHash] = {
        ...magnetUri,
      };

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

    return stream;
  }

  async drop({ magnetUri }: { magnetUri: MagnetUri }) {
    return await this._mainPort
      .send<void>("drop", { magnetUri })
      .then(() => {
        delete this._magnetUris[magnetUri.infoHash];
      });
  }

  async length({
    magnetUri,
    name,
    path,
  }: {
    magnetUri: MagnetUri;
    name: string;
    path: string;
  }): Promise<number> {
    return await this._mainPort.send<number>("length", {
      magnetUri,
      name,
      path,
    });
  }

  async files({
    magnetUri,
  }: {
    magnetUri: MagnetUri;
  }): Promise<{ name: string; path: string; size: number }[]> {
    return await this._mainPort.send<
      { name: string; path: string; size: number }[]
    >("files", {
      magnetUri,
    });
  }

  async load(): Promise<number> {
    return await this._mainPort.send<number>("load");
  }

  async remove({
    magnetUri,
    force,
  }: {
    magnetUri: MagnetUri;
    force: boolean;
  }): Promise<void> {
    return await this._mainPort
      .send<void>("remove", { infoHash: magnetUri.infoHash, force })
      .then(() => {
        delete this._magnetUris[magnetUri.infoHash];
      });
  }

  async resume({ magnetUri }: { magnetUri: MagnetUri }): Promise<boolean> {
    return await this._mainPort
      .send<{ name: string; path: string }[]>("resume", {
        infoHash: magnetUri.infoHash,
      })
      .then((files) => {
        if (files.length > 0)
          this._magnetUris[magnetUri.infoHash] = {
            ...magnetUri,
          };
        return files.length !== 0;
      });
  }

  async resumeMany({
    magnetUris,
  }: {
    magnetUris: MagnetUri[];
  }): Promise<boolean[]> {
    for (let magnetUri of magnetUris)
      this._magnetUris[magnetUri.infoHash] = {
        ...magnetUri,
      };

    const resumes: boolean[] = [];
    for (let magnetUri of magnetUris)
      resumes.push(await this.resume({ magnetUri }));
    return resumes;
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

  constructor(private cryptoService: CryptoService) {
    testFolder(TORRENT_PATH).then((ok) => {
      if (!ok)
        throw new Error(
          `Unable to access ${TORRENT_PATH}, please check folder permissions`,
        );

      let onlineWorker = 0;
      for (let i = 0; i < TORRENT_MAX_WORKERS; ++i)
        this._workers.push(
          new TorrentWorkerBridge(() => {
            if (++onlineWorker === TORRENT_MAX_WORKERS) this.rescan();
          }),
        );
    });
  }

  private async findBest(
    magnetUri: MagnetUri,
    nullIfNone?: boolean,
  ): Promise<TorrentWorkerBridge> {
    const workers = this._workers.filter((w) => w.has(magnetUri.infoHash));
    if (workers.length === 0) {
      if (nullIfNone) return null;
      return (
        await Promise.all(
          this._workers.map(async (w) => ({
            worker: w,
            load: await w.load(),
          })),
        )
      ).sort((a, b) => a.load - b.load)[0].worker;
    }
    while (workers.length !== 1) await workers.pop().drop({ magnetUri });
    return workers[0];
  }

  private async rescan() {
    if (!(await fileExists(TORRENT_PATH))) return;
    return Promise.all(
      chopArray<fs.Dirent>(
        (
          await fs.promises.readdir(TORRENT_PATH, {
            withFileTypes: true,
          })
        ).filter((file) => file.isDirectory()),
        this._workers.length,
      ).map(async (dirs: fs.Dirent[], worker_index: number) => {
        const magnetUris: MagnetUri[] = [];

        for (let directory of dirs) {
          const fmagnet = path_join(TORRENT_PATH, directory.name + ".magnet");
          if (!(await fileExists(fmagnet))) {
            await fs.promises.rm(fmagnet);
            return;
          }

          const magnet = (await fs.promises.readFile(fmagnet)).toString();
          const magnetUri = parseTorrent(magnet);
          if (!magnetUri.infoHash) {
            await fs.promises.rm(fmagnet);
            return;
          }

          magnetUris.push(magnetUri as any);
        }

        await this._workers[worker_index].resumeMany({ magnetUris });
      }),
    );
  }

  async downloadFile({
    magnet,
    name,
    path,
    start = 0,
    end = 0,
  }: DownloadFileDto & { start?: number; end?: number }): Promise<Readable> {
    const magnetUri = parseTorrent(magnet) as MagnetUri;
    if (!magnetUri || !magnetUri.infoHash)
      throw new HttpException("Invalid magnet", HttpStatus.BAD_REQUEST);
    return (await this.findBest(magnetUri)).download({
      magnetUri,
      name,
      path,
      start,
      end,
    });
  }

  async downloadPlaylist(
    { magnet, name, path }: DownloadPlaylistDto,
    options: { proto: string; host: string },
  ): Promise<{ filename: string; content: string }> {
    const magnetUri = parseTorrent(magnet) as MagnetUri;
    if (!magnetUri || !magnetUri.infoHash)
      throw new HttpException("Invalid magnet", HttpStatus.BAD_REQUEST);

    const files = await this.listFiles({ magnet });

    const fullpath = path_join(path, name);
    if (fullpath && files.findIndex((file) => file.path === fullpath) !== -1)
      while (files[0].path !== fullpath)
        files.push(files.shift() as typeof files[0]);

    return {
      filename: magnetUri.infoHash + ".m3u8",
      content: [
        ...files.reduce(
          (acc, file) => [
            ...acc,
            "",
            "#EXTINF:-1," + file.name,
            toURL(
              options.proto +
                "://" +
                options.host +
                "/api/torrent/download/" +
                encodeURIComponent(file.name),
              {
                path: file.path,
                magnet,
                sig: this.cryptoService.sign(magnet),
              },
            ),
          ],
          ["#EXTM3U"],
        ),
        "",
      ].join("\n"),
    };
  }

  async fileLength({ magnet, name, path }: DownloadFileDto): Promise<number> {
    const magnetUri = parseTorrent(magnet) as MagnetUri;
    if (!magnetUri || !magnetUri.infoHash)
      throw new HttpException("Invalid magnet", HttpStatus.BAD_REQUEST);
    return (await this.findBest(magnetUri)).length({
      magnetUri,
      name,
      path,
    });
  }

  async listFiles({
    magnet,
  }: ListFilesDto): Promise<{ name: string; path: string; size: number }[]> {
    const magnetUri = parseTorrent(magnet) as MagnetUri;
    if (!magnetUri || !magnetUri.infoHash)
      throw new HttpException("Invalid magnet", HttpStatus.BAD_REQUEST);
    return (await this.findBest(magnetUri)).files({ magnetUri });
  }

  async status() {
    return await Promise.all(this._workers.map((w) => w.status()));
  }
}
