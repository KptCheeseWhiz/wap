import os from "./os";

const IS_ELECTON = !!(window as any).IS_ELECTRON;

export const dlurl = (path: string, options: any) =>
  window.origin +
  (path[0] === "/" ? path : "/" + path) +
  "?payload=" +
  encodeURIComponent(btoa(encodeURIComponent(JSON.stringify(options))));

export const streamurl = (path: string, options: any) => {
  const url = dlurl(path, options);
  return os() === "Windows" && !IS_ELECTON
    ? `vlc://openstream/?from=url&url=${url}`
    : `vlc://${url}`;
};
