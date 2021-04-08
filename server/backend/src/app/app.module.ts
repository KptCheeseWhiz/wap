import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join as path_join } from "path";

import { AppController } from "./app.controller";

import { SearcherModule } from "@/searcher/searcher.module";
import { TorrentModule } from "@/torrent/torrent.module";
import { ServiceWorkerModule } from "@/serviceworker/serviceworker.module";

@Module({
  imports: [
    TorrentModule,
    SearcherModule,
    ServiceWorkerModule,
    ServeStaticModule.forRoot({
      rootPath: path_join(__dirname, "..", "public"),
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
