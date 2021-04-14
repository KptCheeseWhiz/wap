import { spawn as cp_spawn } from "child_process";
import * as fs from "fs";
import EventEmitter from "events";
import { join as path_join, dirname as path_dirname } from "path";

import { HttpException, HttpStatus } from "@nestjs/common";

export const sleep = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const waitFor = <T>(event: string, ee: EventEmitter) =>
  new Promise<T>((resolve, reject) =>
    ee.once(event, (t: T) => resolve(t)).once("error", (err) => reject(err)),
  );

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
    .mkdir(fpath, { recursive: true })
    .then(() => fs.promises.rmdir(fpath))
    .then(() => true)
    .catch(() => false);
};

export const toURL = (base: string, qs: any = {}) => {
  const url = new URL(base);
  for (let [k, v] of Object.entries(qs).filter(
    ([_, v]) => typeof v !== "undefined" && v !== null,
  ))
    url.searchParams.append(k, (v as string | number).toString());
  return url.href;
};

export const toQuery = (base: string, qs: any = {}) => {
  const url = new URLSearchParams();
  for (let [k, v] of Object.entries(qs).filter(
    ([_, v]) => typeof v !== "undefined" && v !== null,
  ))
    url.append(k, (v as string | number).toString());
  return base + "?" + url.toString();
};

export const pspawn = async (exec: string, args: string[]) =>
  await new Promise<void>((resolve, reject) =>
    cp_spawn(exec, args, {
      stdio: ["ignore", "inherit", "inherit"],
    })
      .once("error", (err) => reject(err))
      .once("exit", (code) => (code === 0 ? resolve() : reject(code))),
  );

export const touch = (path: string, mkdir?: boolean) => {
  if (mkdir) fs.mkdirSync(path_dirname(path), { recursive: true });
  fs.closeSync(fs.openSync(path, "a"));
};

export const parseRange = (
  range: string,
  length: number,
): { start: number; end: number } => {
  let [start, end]: any[] = (range || "").slice(6).split("-");
  start = parseInt(start, 10);
  end = end ? parseInt(end, 10) : length - 1;
  if (!isNaN(start) && isNaN(end)) end = length - 1;
  if (isNaN(start) && !isNaN(end)) {
    start = length - end;
    end = length - 1;
  }

  if (start >= length || end >= length)
    throw new HttpException(
      "Invalid content range",
      HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
    );

  return { start, end };
};
