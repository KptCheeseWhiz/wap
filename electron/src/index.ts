import { join as path_join } from "path";
import { existsSync as fs_exists, mkdirSync as fs_mkdir } from "fs";
import { app, BrowserWindow, nativeTheme } from "electron";
import { homedir as os_homedir } from "os";
import { randomBytes as crypto_randomBytes } from "crypto";

if (!process.env.NODE_ENV)
  process.env.NODE_ENV = process.argv0.endsWith("node")
    ? "development"
    : "production";

import * as exception from "./utils/exception";
exception.on();

const HOME = path_join(os_homedir(), ".wap");
if (!fs_exists(HOME)) fs_mkdir(HOME);

if (!process.env.HMAC_SECRET)
  process.env.HMAC_SECRET = crypto_randomBytes(64).toString("hex");
if (!process.env.TORRENT_MAX_WORKERS) process.env.TORRENT_MAX_WORKERS = "2";
if (!process.env.TORRENT_PATH) process.env.TORRENT_PATH = HOME;
if (!process.env.TORRENT_MAX_RATIO) process.env.TORRENT_MAX_RATIO = "0";
if (!process.env.TORRENT_EXPIRATION)
  process.env.TORRENT_EXPIRATION = "10800000";
if (!process.env.TORRENT_PRUNE_INTERVAL)
  process.env.TORRENT_PRUNE_INTERVAL = "0";

import bootstrap from "./app/app";

(async () => {
  nativeTheme.themeSource = "dark";
  await app.whenReady();

  const SERVER_URL = await bootstrap("127.0.0.1", 0).then((app: any) =>
    app.getUrl()
  );

  const createWindow = () => {
    const mainWindow = new BrowserWindow({
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

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  createWindow();
})();
