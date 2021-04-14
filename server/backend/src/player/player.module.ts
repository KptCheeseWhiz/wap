import { Module } from "@nestjs/common";

import { PlayerService } from "./player.service";
import { PlayerController } from "./player.controller";

import { CryptoModule } from "@/crypto/crypto.module";
import { TorrentModule } from "@/torrent/torrent.module";

@Module({
  imports: [CryptoModule, TorrentModule],
  providers: [PlayerService],
  controllers: [PlayerController],
})
export class PlayerModule {}
