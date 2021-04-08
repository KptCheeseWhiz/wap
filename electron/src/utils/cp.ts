import { spawn as cp_spawn } from "child_process";

export const pspawn = async (exec: string, args: string[]) =>
  await new Promise<void>((resolve, reject) =>
    cp_spawn(exec, args, {
      stdio: ["ignore", "inherit", "inherit"],
    })
      .once("error", (err) => reject(err))
      .once("exit", (code) => (code === 0 ? resolve() : reject(code)))
  );
