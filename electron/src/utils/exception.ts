import * as electron from "electron";

function catchexceptions(err: Error) {
  if (electron.app.isReady())
    electron.dialog.showErrorBox("Error", err.message);
  console.log("exception", err);
  process.exit(1);
}

export const on = () => {
  process.on("unhandledRejection", catchexceptions);
  process.on("uncaughtException", catchexceptions);
};

export const off = () => {
  process.off("unhandledRejection", catchexceptions);
  process.off("uncaughtException", catchexceptions);
};
