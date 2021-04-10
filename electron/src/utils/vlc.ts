import { existsSync as fs_exists } from "fs";
import { join as path_join } from "path";

import * as electron from "electron";
import fetch from "node-fetch";
import * as unzipper from "unzipper";

import { pspawn } from "./cp";

export const is_installed = (): boolean =>
  process.platform === "win32"
    ? fs_exists(path_join(__dirname, "../vlc-3.0.12/vlc.exe"))
    : !!process.env.PATH.split(":")
        .map((p) => path_join(p, "vlc"))
        .find(fs_exists);

export const install = async (): Promise<boolean> => {
  if (process.platform !== "win32") {
    await electron.dialog.showMessageBox(null, {
      title: "VLC is missing",
      message: "Please install VLC using your favorite package manager",
    });
    return false;
  }

  await fetch(
    "https://get.videolan.org/vlc/3.0.12/win64/vlc-3.0.12-win64.zip"
  ).then(
    (res) =>
      new Promise<void>((resolve, reject) =>
        res.body
          .pipe(unzipper.Extract({ path: path_join(__dirname, "..") }))
          .once("error", (err) => reject(err))
          .once("close", () => resolve())
      )
  );
  
  return true;
};

export const spawn = async (url: string) =>
  process.platform === "win32"
    ? await pspawn(path_join(__dirname, "../vlc-3.0.12/vlc.exe"), [url])
    : await pspawn("vlc", [url]);
