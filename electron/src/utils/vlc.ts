import { existsSync as fs_exists } from "fs";
import { join as path_join } from "path";

import { pspawn } from "./cp";

export const refer = async () =>
  process.platform === "win32"
    ? await pspawn("powershell", [
        "-Command",
        "start ms-windows-store://pdp?productId=9NBLGGH4VVNH",
      ])
    : await pspawn("xdg-open", ["https://www.videolan.org/vlc/"]);

export const is_installed = async () =>
  process.platform === "win32"
    ? await pspawn("powershell", [
        "-Command",
        "If ($(Get-AppxPackage -Name VideoLAN.VLC) -eq $null) { exit 999 } Else { exit 0 }",
      ])
        .then(() => true)
        .catch((code) => {
          if (code === 999) return false;
          throw new Error("unexpected error code " + code);
        })
    : process.env.PATH.split(":")
        .map((p) => path_join(p, "vlc"))
        .find(fs_exists);

export const spawn = async (url: string) =>
  process.platform === "win32"
    ? await pspawn("powershell", [
        "-Command",
        `start 'vlc://openstream/?from=url&url=${encodeURIComponent(url)}'`,
      ])
    : await pspawn("vlc", [url]);
