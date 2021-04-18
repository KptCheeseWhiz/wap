import { join as path_join } from "path";
import {
  existsSync as fs_exists,
  mkdirSync as fs_mkdir,
  readFileSync as fs_readFileSync,
} from "fs";
import * as electron from "electron";
import { config as dotenv_config } from "dotenv";
import { homedir as os_homedir } from "os";
import { randomBytes as crypto_randomBytes } from "crypto";
import { merge as _merge } from "lodash";
dotenv_config({ path: path_join(__dirname, ".env") });

import * as exception from "./utils/exception";
exception.on();

const HOME = path_join(os_homedir(), ".wap");
if (!fs_exists(HOME)) fs_mkdir(HOME);

process.env.TORRENT_MAX_WORKERS = "2";
process.env.TORRENT_PATH = HOME;
process.env.TORRENT_MAX_RATIO = "0";
process.env.TORRENT_EXPIRATION = "10800000";
process.env.TORRENT_PRUNE_INTERVAL = "0";
process.env.HMAC_SECRET = crypto_randomBytes(64).toString("hex");

import bootstrap from "./app/app";

(async () => {
  try {
    const flags = path_join(HOME, "flags");
    if (fs_exists(flags))
      _merge(
        electron.nativeTheme,
        JSON.parse(fs_readFileSync(flags).toString())
      );
  } catch (e) {
    console.error("error in ~/.wap/flags", e);
  }

  await electron.app.whenReady();

  const SERVER_URL = await bootstrap("127.0.0.1", 0).then((app: any) =>
    app.getUrl()
  );

  const createWindow = () => {
    const mainWindow = new electron.BrowserWindow({
      width: 1920,
      height: 1080,
      backgroundColor: "#303030",
      title: "Web Anime Player",
      icon: path_join(__dirname, "app/public/icons/256.png"),
      show: false,
      webPreferences: {
        devTools: process.env.NODE_ENV === "development",
        preload: path_join(__dirname, "renderer.js"),
        enableRemoteModule: false,
      },
    });
    mainWindow.setMenuBarVisibility(false);

    mainWindow.webContents.on("did-fail-load", () =>
      mainWindow.loadURL(`${SERVER_URL}/search`)
    );

    mainWindow.loadURL(`${SERVER_URL}/search`);

    mainWindow.on("ready-to-show", () => mainWindow.show());
  };

  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  electron.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") electron.app.quit();
  });

  createWindow();
})();
