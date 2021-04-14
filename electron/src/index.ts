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

import bootstrap from "./app/app";
import * as exception from "./utils/exception";
import * as vlc from "./utils/vlc";

exception.on();

const HOME = path_join(os_homedir(), ".wap");
if (!fs_exists(HOME)) fs_mkdir(HOME);

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

  process.env.TORRENT_PATH = HOME;
  process.env.HMAC_SECRET = crypto_randomBytes(64).toString("hex");
  const PORT = await bootstrap(process.env.HOST, +process.env.PORT)
    .then((app: any) => app.getUrl())
    .then((url: string) => Number(url.toString().split(":").pop()));

  if (!vlc.is_installed()) {
    if (!(await vlc.install())) process.exit(0);
  }

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

    mainWindow.webContents.on("new-window", (event, url) => {
      if (/^vlc:\/\/.+/.test(url)) {
        vlc
          .spawn(url.substr(6))
          .catch((err) =>
            electron.dialog.showErrorBox(
              "Something went wrong with VLC",
              err.message
            )
          );
      }
      event.preventDefault();
    });

    mainWindow.webContents.on("did-fail-load", () =>
      mainWindow.loadURL(`http://localhost:${PORT}/search`)
    );

    mainWindow.loadURL(`http://localhost:${PORT}/search`);

    mainWindow.on("ready-to-show", () => mainWindow.show());
  };

  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  electron.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") electron.app.quit();
  });

  electron.protocol.registerHttpProtocol("vlc", async (request, callback) => {
    if (/^vlc:\/\/.+/.test(request.url)) {
      await vlc
        .spawn(request.url.substr(6))
        .catch((err) =>
          electron.dialog.showErrorBox(
            "Something went wrong with VLC",
            err.message
          )
        );
    }
    callback(null);
  });

  createWindow();
})();
