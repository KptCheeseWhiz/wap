import {
  isMainThread,
  workerData,
  MessagePort,
  MessageChannel,
  TransferListItem,
} from "worker_threads";
import { Readable } from "stream";
import { join as path_join } from "path";
import * as fs from "fs";

import * as parseTorrent from "parse-torrent";
import * as WebTorrent from "webtorrent";

import PortHelper from "@/common/port.helper";
import Logger from "@/common/logger.helper";
import { sleep, fileExists } from "@/common/utils.helper";

const TORRENT_PATH = process.env.TORRENT_PATH || "./torrents";
const TORRENT_MAX_RATIO = +process.env.TORRENT_MAX_RATIO || 2;
const TORRENT_EXPIRATION = +process.env.TORRENT_EXPIRATION || 604800000;
const TORRENT_PRUNE_INTERVAL = +process.env.TORRENT_PRUNE_INTERVAL || 0;
const TORRENT_THROTTLE = +process.env.TORRENT_THROTTLE || 10;
const TORRENT_FILE_TIMEOUT = +process.env.TORRENT_FILE_TIMEOUT || 15000;

class TorrentWorker {
  private _id: string;
  private _mainPort: PortHelper;
  private _pending: number = 0;

  private _dlclient: WebTorrent.Instance;
  private _flclient: WebTorrent.Instance;

  constructor({ port, id }: { port: MessagePort; id: string }) {
    this._id = id;
    this._mainPort = new PortHelper(port);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("events").defaultMaxListeners = 0;
    this._dlclient = new WebTorrent();
    this._flclient = new WebTorrent();

    this._mainPort.passthru<TorrentWorker>(this, [
      "download",
      "drop",
      "length",
      "files",
      "load",
      "prune",
      "remove",
      "resume",
      "status",
    ]);

    this._mainPort
      .waitClose()
      .then(() =>
        Promise.all([
          new Promise<void>((resolve, reject) =>
            this._dlclient.destroy((err) => {
              if (err) {
                Logger(this._id).error(
                  "Error closing _dlclient" +
                    (typeof err === "string" ? err : err.message),
                  "",
                );
                reject(err);
              } else resolve();
            }),
          ),
          new Promise<void>((resolve, reject) =>
            this._flclient.destroy((err) => {
              if (err) {
                Logger(this._id).error(
                  "Error closing _flclient" +
                    (typeof err === "string" ? err : err.message),
                  "",
                );
                reject(err);
              } else resolve();
            }),
          ),
        ]),
      )
      .then(() => process.exit(0))
      .catch(() => process.exit(1));

    if (TORRENT_PRUNE_INTERVAL !== 0)
      setInterval(() => this.prune(), Math.min(TORRENT_PRUNE_INTERVAL, 900000));

    Logger(this._id).log(`is ready`);
    this._mainPort.emit("ready");
  }

  async download({
    magnet,
    name,
    path,
    start,
    end,
  }: {
    magnet: string;
    name: string;
    path: string;
    start?: number;
    end?: number;
  }): Promise<{
    infoHash: string;
    length: number;
    port: MessagePort;
    _transferList: TransferListItem[];
  }> {
    try {
      this._pending++;

      const magnetUri = parseTorrent(magnet);
      if (!magnetUri.infoHash) throw new Error("Invalid magnet");
      (magnetUri as any).so = "-1";

      return await new Promise<{
        infoHash: string;
        length: number;
        port: MessagePort;
        _transferList: TransferListItem[];
      }>(async (resolve, reject) => {
        const torrent =
          this._dlclient.get(magnet) ||
          (await new Promise<WebTorrent.Torrent>((resolve) =>
            this._dlclient.add(
              parseTorrent.toMagnetURI(magnetUri),
              {
                path: path_join(TORRENT_PATH, magnetUri.infoHash),
              },
              async (torrent) => {
                torrent.files.forEach((file) => file.deselect());
                torrent.deselect(0, torrent.pieces.length - 1, 0);

                await fs.promises.writeFile(
                  path_join(TORRENT_PATH, magnetUri.infoHash + ".magnet"),
                  magnet,
                );

                resolve(torrent);
              },
            ),
          ));

        const fullpath = path_join(path, name);
        const file = torrent.files.find((file) => file.path === fullpath);
        if (!file)
          return reject(
            new Error(`File ${fullpath} not found in ${magnetUri.infoHash}`),
          );

        if (!file.managed) {
          file.managed = true;
          file.createdAt = new Date();
          file.handles = 0;
          file.uploaded = 0;

          Logger(this._id).log(`${torrent.infoHash} ${fullpath} added`);
        }
        file.expiresAt = new Date(Date.now() + TORRENT_EXPIRATION);
        file.handles++;

        const { port1, port2 } = new MessageChannel();
        const uploadPort = new PortHelper(port2);

        let index = 0;
        let offset = 0;

        const stream = new Readable()
          .wrap(
            file.createReadStream({
              start: start || 0,
              end: end || file.length,
            }),
          )
          .on("data", function (this: Readable, buffer: Buffer) {
            this.pause();
            uploadPort
              .send("write", {
                buffer,
                index: index++,
                offset: (offset += buffer.length) - buffer.length,
              })
              .then((destroyed: boolean) => {
                if (destroyed) return this.destroy();
                file.uploaded += buffer.length;
                setTimeout(() => this.resume(), TORRENT_THROTTLE);
              })
              .catch((err: Error) => {
                if (err.message !== "close") throw err;
              });
          });

        uploadPort.waitClose().then(() => {
          if (!stream.destroyed) stream.destroy();
          file.handles--;
        });

        resolve({
          infoHash: magnetUri.infoHash,
          length: file.length,
          port: port1,
          _transferList: [port1],
        });
      });
    } catch (e) {
      Logger(this._id).error(e.message, e.stack);
      throw e;
    } finally {
      this._pending--;
    }
  }

  async drop({ infoHash }: { infoHash: string }): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        Logger(this._id).log(`${infoHash} dropped`);
        if (this._dlclient.get(infoHash))
          return this._dlclient.remove(
            infoHash,
            { destroyStore: false },
            (err) => (err ? reject(err) : resolve()),
          );
        return resolve();
      } catch (e) {
        Logger(this._id).error(e.message, e.stack);
        reject(e);
      }
    });
  }

  async length({
    magnet,
    name,
    path,
  }: {
    magnet: string;
    name?: string;
    path?: string;
  }): Promise<number> {
    const magnetUri = parseTorrent(magnet);
    if (!magnetUri.infoHash) throw new Error("Invalid magnet");
    (magnetUri as any).so = "-1";

    // Asking for length means you want to download it
    const torrent =
      this._dlclient.get(magnet) ||
      (await new Promise<WebTorrent.Torrent>((resolve) =>
        this._dlclient.add(
          parseTorrent.toMagnetURI(magnetUri),
          {
            path: path_join(TORRENT_PATH, magnetUri.infoHash),
          },
          async (torrent) => {
            torrent.files.forEach((file) => file.deselect());
            torrent.deselect(0, torrent.pieces.length - 1, 0);
            resolve(torrent);
          },
        ),
      ));

    if (!name) return torrent.length;

    const fullpath = path_join(path, name);
    const file = torrent.files.find((file) => file.path === fullpath);
    if (!file)
      throw new Error(`File ${fullpath} not found in ${magnetUri.infoHash}`);
    return file.length;
  }

  async files({
    magnet,
  }: {
    magnet: string;
  }): Promise<{ name: string; path: string; size: number }[]> {
    try {
      this._pending++;

      const magnetUri = parseTorrent(magnet);
      if (!magnetUri.infoHash) throw new Error("Invalid magnet");
      (magnetUri as any).so = "-1";

      Logger(this._id).log(`${magnetUri.infoHash} fetching files`);

      const path = path_join(TORRENT_PATH, magnetUri.infoHash);

      const torrent = this._dlclient.get(magnet) || this._flclient.get(magnet);
      if (torrent) {
        const files = torrent.files.map(({ name, path, length: size }) => ({
          name,
          path: path.substr(0, path.length - name.length),
          size,
        }));
        Logger(this._id).log(
          `${magnetUri.infoHash} knew ${files.length} files`,
        );
        return files;
      }

      return await new Promise<{ name: string; path: string; size: number }[]>(
        (resolve, reject) => {
          const timeout = setTimeout(() => {
            if (this._flclient.get(magnet)) this._flclient.remove(magnet);
            reject(new Error("Timed out!"));
          }, TORRENT_FILE_TIMEOUT);

          this._flclient.add(
            parseTorrent.toMagnetURI(magnetUri),
            {
              path,
            },
            async (torrent) => {
              clearTimeout(timeout);

              torrent.files.forEach((file) => file.deselect());
              torrent.deselect(0, torrent.pieces.length - 1, 0);
              const files = torrent.files.map(
                ({ name, path, length: size }) => ({
                  name,
                  path: path.substr(0, path.length - name.length),
                  size,
                }),
              );

              await new Promise<void>((resolve, reject) =>
                this._flclient.remove(magnet, { destroyStore: true }, (err) =>
                  err ? reject(err) : resolve(),
                ),
              );
              await fs.promises.rm(path, { recursive: true, force: true });

              Logger(this._id).log(
                `${magnetUri.infoHash} found ${files.length} files`,
              );
              resolve(files);
            },
          );
        },
      );
    } catch (e) {
      Logger(this._id).error(e.message, e.stack);
      throw e;
    } finally {
      this._pending--;
    }
  }

  async load(): Promise<number> {
    return (
      this._dlclient.torrents.reduce(
        (acc, torrent) =>
          acc +
          torrent.files
            .filter((file) => file.managed)
            .reduce((acc, file) => acc + file.length, 0),
        0,
      ) +
      this._pending * 1000000000
    );
  }

  async prune(): Promise<void> {
    try {
      for (const torrent of this._dlclient.torrents) {
        if (
          torrent.files.every(
            (file) =>
              ((TORRENT_MAX_RATIO !== 0 &&
                torrent.uploaded * TORRENT_MAX_RATIO > torrent.downloaded) ||
                file.createdAt.getTime() + TORRENT_EXPIRATION < Date.now()) &&
              file.handles === 0,
          )
        ) {
          Logger(this._id).log(`${torrent.infoHash} is expired`);
          await this.remove({ infoHash: torrent.infoHash, force: true });
        }
      }
    } catch (e) {
      Logger(this._id).error(e.message, e.stack);
      throw e;
    }
  }

  async remove({
    infoHash,
    force,
  }: {
    infoHash: string;
    force: boolean;
  }): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const path = path_join(TORRENT_PATH, infoHash);

        const torrent = this._dlclient.get(infoHash);
        if (!torrent) return resolve();

        if (!force)
          while (
            !torrent.files
              .filter((f) => f.managed)
              .every((f) => f.handles === 0)
          )
            await sleep(1000);

        torrent.destroy(
          {
            destroyStore: true,
          },
          async () => {
            Logger(this._id).log(`${infoHash} removed`);
            await Promise.all([
              fs.promises.rm(path, { recursive: true, force: true }),
              fs.promises.rm(path + ".magnet", { force: true }),
            ]);
            resolve();
          },
        );
      } catch (e) {
        Logger(this._id).error(e.message, e.stack);
        reject(e);
      }
    });
  }

  async resume({ infoHash }: { infoHash: string }): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        Logger(this._id).log(`${infoHash} resuming`);

        const path = path_join(TORRENT_PATH, infoHash);

        const createdAt = (
          await fs.promises.stat(path_join(TORRENT_PATH, infoHash + ".magnet"))
        ).birthtime;

        if (createdAt.getTime() + TORRENT_EXPIRATION < Date.now()) {
          Logger(this._id).log(`${infoHash} expired`);
          await Promise.all([
            fs.promises.rm(path_join(TORRENT_PATH, infoHash + ".magnet")),
            fs.promises.rm(path_join(TORRENT_PATH, infoHash), {
              recursive: true,
              force: true,
            }),
          ]);
          return resolve(false);
        } else resolve(true);

        const magnet = (
          await fs.promises.readFile(
            path_join(TORRENT_PATH, infoHash + ".magnet"),
          )
        ).toString();

        const magnetUri = parseTorrent(magnet);
        if (!magnetUri.infoHash) return;
        (magnetUri as any).so = "-1";

        const torrent = await new Promise<WebTorrent.Torrent>((resolve) =>
          this._dlclient.add(
            parseTorrent.toMagnetURI(magnetUri),
            {
              path,
            },
            (torrent: WebTorrent.Torrent) => {
              torrent.files.forEach((file) => file.deselect());
              torrent.deselect(0, torrent.pieces.length - 1, 0);
              resolve(torrent);
            },
          ),
        );

        for (const file of torrent.files)
          if (await fileExists(path_join(TORRENT_PATH, infoHash, file.path))) {
            file.managed = true;
            file.createdAt = createdAt;
            file.expiresAt = new Date(createdAt.getTime() + TORRENT_EXPIRATION);
            file.handles = 0;
            file.uploaded = 0;

            Logger(this._id).log(`${infoHash} ${file.name} resumed`);
            file.select();
          }
      } catch (e) {
        Logger(this._id).error(e.message, e.stack);
        reject(e);
      }
    });
  }

  async status() {
    try {
      return {
        load: await this.load(),
        downloadSpeed: this._dlclient.downloadSpeed || 0,
        uploadSpeed: this._dlclient.uploadSpeed || 0,
        pending: this._pending,
        torrents: this._dlclient.torrents
          .map((torrent: WebTorrent.Torrent) => ({
            name: torrent.name,
            infoHash: torrent.infoHash,
            uploaded: torrent.uploaded || 0,
            uploadSpeed: torrent.uploadSpeed || 0,
            downloaded: torrent.downloaded || 0,
            downloadSpeed: torrent.downloadSpeed || 0,
            ratio: torrent.ratio || 0,
            numPeers: torrent.numPeers || 0,
            progress: torrent.progress || 0,
            files: torrent.files
              .filter((file) => file.managed)
              .map((file: WebTorrent.TorrentFile) => ({
                name: file.name,
                path: file.path.substr(0, file.path.length - file.name.length),
                length: file.length,
                progress: file.progress,
                uploaded: file.uploaded,
                handles: file.handles,
                createdAt: file.createdAt,
                expiresAt: file.expiresAt,
              }))
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
          }))
          .sort(
            (a, b) =>
              (b.files[0]?.createdAt.getTime() || 0) -
              (a.files[0]?.createdAt.getTime() || 0),
          ),
      };
    } catch (e) {
      Logger(this._id).error(e.message, e.stack);
      throw e;
    }
  }
}

if (!isMainThread) new TorrentWorker(workerData);
