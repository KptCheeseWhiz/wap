import * as fs from "fs";
import * as path from "path";
import * as unzipper from "unzipper";
import { downloadArtifact } from "@electron/get";
import * as yargs from "yargs-parser";
import * as npm from "../package.json";

const args = yargs(process.argv.slice(2));
const out = args._[0] ? args._[0] : "./electron";
const isWin32 = (args.platform || process.platform) === "win32";
const exec = args.name || npm.name;

downloadArtifact({
  artifactName: "electron",
  arch: process.arch,
  platform: process.platform,
  version: npm.devDependencies.electron.replace(/[^\d\.]/g, ""),
  ...args,
})
  .then(
    (zip) =>
      new Promise((resolve, reject) =>
        fs
          .createReadStream(zip)
          .pipe(
            unzipper.Extract({
              path: out,
            })
          )
          .once("close", () => resolve())
          .once("error", (err) => reject(err))
      )
  )
  .then(async () => {
    if (process.platform !== "win32" && !isWin32)
      await fs.promises.chmod(path.join(out, "electron"), 0o755);
    await fs.promises.rename(
      path.join(out, "electron" + (isWin32 ? ".exe" : "")),
      path.join(out, exec + (isWin32 ? ".exe" : ""))
    );
  });
