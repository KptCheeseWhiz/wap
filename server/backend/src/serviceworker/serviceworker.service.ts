import { promises as fpromises } from "fs";
import { resolve as path_resolve, join as path_join } from "path";

import { Injectable } from "@nestjs/common";

@Injectable()
export class ServiceWorkerService {
  private async getPublicFiles(): Promise<string[]> {
    const base = path_join(__dirname, "..", "public");
    const getFiles = async (dir: string): Promise<string[]> => {
      const dirents = await fpromises.readdir(dir, { withFileTypes: true });
      const files = [];
      for (let dirent of dirents) {
        const res = path_resolve(dir, dirent.name);
        if (dirent.isDirectory()) files.push(...(await getFiles(res)));
        else files.push(res.slice(base.length));
      }
      return files;
    };
    return await getFiles(base);
  }

  private _cache: string = "";
  async generate(): Promise<string> {
    if (this._cache) return this._cache;
    return (this._cache = `// This file is generated dynamically
const cacheName = "wap-pwa"

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .delete(cacheName)
      .then(() =>
        caches
          .open(cacheName)
          .then((cache) =>
            Promise.all(
              [
                ${
                  (await this.getPublicFiles())
                    .filter((f) => !f.endsWith(".map"))
                    .map((f) => `"${f}"`)
                    .join(",\n                ") + ","
                }
              ].map((f) => cache.add(f)),
            ),
          ),
      ),
  );
});

self.addEventListener("fetch", (event) =>
  event.respondWith(
    caches.open(cacheName).then((cache) =>
      /^\\/(search|player)?(\\?.+)$/.test(
        event.request.url.slice(self.location.origin.length),
      )
        ? cache.match("/index.html")
        : cache.match(event.request, { ignoreSearch: true }).then((hit) =>
            hit
              ? hit
              : fetch(event.request).catch(() =>
                  event.request.url === self.location.origin + "/api/ping"
                    ? new Response('{"pong":false}', {
                        status: 200,
                        headers: {
                          "content-type": "application/json",
                        },
                      })
                    : cache.match("/index.html"),
                ),
          ),
    ),
  ),
);\n\n`);
  }
}
