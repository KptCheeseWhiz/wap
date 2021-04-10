import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from "@nestjs/common";

import { TorrentService } from "./torrent.service";
import { TorrentController } from "./torrent.controller";

import { QueryStringParserMiddleware } from "@/middlewares/queryStringParser.middleware";
import { CryptoModule } from "@/crypto/crypto.module";

@Module({
  imports: [CryptoModule],
  providers: [TorrentService],
  controllers: [TorrentController],
})
export class TorrentModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(QueryStringParserMiddleware)
      .forRoutes(
        { path: "/api/torrent/download", method: RequestMethod.GET },
        { path: "/api/torrent/playlist", method: RequestMethod.GET },
        { path: "/api/torrent/playone", method: RequestMethod.GET },
      );
  }
}
