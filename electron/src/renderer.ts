import {
  existsSync as fs_exists,
  writeFileSync as fs_writeFile,
  readFileSync as fs_readFileSync,
} from "fs";
import { join as path_join } from "path";
import { homedir as os_homedir } from "os";

import * as electron from "electron";

const storage_path = path_join(os_homedir(), ".wap", "storage");

const read = (): any => JSON.parse(fs_readFileSync(storage_path).toString());
const write = (json: any): void =>
  fs_writeFile(storage_path, JSON.stringify(json));

if (!fs_exists(storage_path)) write({});
else
  try {
    read();
  } catch (e) {
    write({});
  }

electron.contextBridge.exposeInMainWorld("ELECTRON", true);
electron.contextBridge.exposeInMainWorld("storage", {
  clear: (): void => {
    return write({});
  },
  getItem(key: string): string {
    return read()[key];
  },
  removeItem(key: string): void {
    return write({ ...read(), [key]: undefined });
  },
  setItem(key: string, value: string): void {
    return write({ ...read(), [key]: value });
  },
});
