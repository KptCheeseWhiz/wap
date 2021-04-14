import { Module } from "@nestjs/common";

import { TorrentService } from "./torrent.service";
import { TorrentController } from "./torrent.controller";

import { CryptoModule } from "@/crypto/crypto.module";

@Module({
  imports: [CryptoModule],
  providers: [TorrentService],
  controllers: [TorrentController],
  exports: [TorrentService],
})
export class TorrentModule {}
