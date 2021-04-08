import { Module } from "@nestjs/common";

import { SearcherService } from "./searcher.service";
import { SearcherController } from "./searcher.controller";

import { CryptoModule } from "@/crypto/crypto.module";

@Module({
  imports: [CryptoModule],
  providers: [SearcherService],
  controllers: [SearcherController],
})
export class SearcherModule {}
