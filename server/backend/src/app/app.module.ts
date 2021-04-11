import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join as path_join } from "path";

import { AppController } from "./app.controller";

import { SearcherModule } from "@/searcher/searcher.module";
import { TorrentModule } from "@/torrent/torrent.module";
import { ServiceWorkerModule } from "@/serviceworker/serviceworker.module";
import { ProxyModule } from "@/proxy/proxy.module";

@Module({
  imports: [
    TorrentModule,
    SearcherModule,
    ServiceWorkerModule,
    // Proxy requests to front end server if in development
    ...(process.env.NODE_ENV === "development" ? [ProxyModule] : []),
    ServeStaticModule.forRoot({
      rootPath: path_join(__dirname, "..", "public"),
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
