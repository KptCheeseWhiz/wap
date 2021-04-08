import * as fs from "fs";
import { join as path_join } from "path";

export const sleep = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const fileExists = async (path: string): Promise<boolean> =>
  await fs.promises
    .access(path)
    .then(() => true)
    .catch(() => false);

export const testFolder = async (path: string): Promise<boolean> => {
  const fpath = path_join(path, "check_permissions");
  if (await fileExists(fpath))
    return await fs.promises
      .rmdir(fpath)
      .then(() => true)
      .catch(() => false);
  return await fs.promises
    .mkdir(fpath)
    .then(() => fs.promises.rmdir(fpath))
    .then(() => true)
    .catch(() => false);
};
