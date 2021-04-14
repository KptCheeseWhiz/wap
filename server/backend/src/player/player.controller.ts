import {
  Controller,
  Get,
  Header,
  Headers,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";

import { PlayerService } from "./player.service";
import { GetSubtitlesDto } from "./dto/getSubtitles.dto";
import { ListSubtitlesDto } from "./dto/listSubtitles.dto";

import { TorrentService } from "@/torrent/torrent.service";
import { DownloadFileDto } from "@/torrent/dto/downloadFile.dto";
import { MagnetSignGuard } from "@/guards/magnetSign.guard";
import { parseRange } from "@/common/utils.helper";

@UseGuards(MagnetSignGuard)
@Controller("/api/player")
export class PlayerController {
  constructor(
    private playerService: PlayerService,
    private torrentService: TorrentService,
  ) {}

  @Get("play")
  @Header("connection", "close")
  @Header("accept-ranges", "bytes")
  @Header("content-type", "application/octet-stream")
  async playFile(
    @Headers("range") range: string,
    @Query() downloadFileDto: DownloadFileDto & { name: string; sig: string },
    @Res() res: Response,
  ) {
    const length = await this.torrentService.fileLength(downloadFileDto);
    const { start, end } = parseRange(range, length);

    res.setHeader("content-length", end - start + 1);
    if (end - start !== length) {
      res.setHeader(
        "content-range",
        "bytes " + start + "-" + end + "/" + length,
      );
      res.status(206);
    }

    const stream = await this.torrentService.downloadFile({
      ...downloadFileDto,
      start,
      end,
    });

    stream.pipe(res.once("close", () => stream.destroy()));
  }

  @Get("subtitles")
  async listSubtitles(
    @Query() listSubtitlesDto: ListSubtitlesDto & { sig: string },
  ) {
    return await this.playerService.listSubtitles(listSubtitlesDto);
  }

  @Get("subtitle")
  @Header("content-type", "text/vtt")
  async getSubtitles(
    @Query()
    getSubtitlesDto: GetSubtitlesDto & { sig: string },
    @Res() res: Response,
  ) {
    const stream = await this.playerService.getSubtitle(getSubtitlesDto);
    stream.pipe(res.once("close", () => stream.destroy()));
  }
}
