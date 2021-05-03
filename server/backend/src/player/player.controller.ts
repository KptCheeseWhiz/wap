import {
  Controller,
  Get,
  Header,
  Headers,
  HttpException,
  HttpStatus,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import rangeParse from "range-parser";

import { PlayerService } from "./player.service";
import { GetSubtitleDto } from "./dto/getSubtitle.dto";
import { GetSubtitlesDto } from "./dto/getSubtitles.dto";

import { TorrentService } from "@/torrent/torrent.service";
import { DownloadFileDto } from "@/torrent/dto/downloadFile.dto";
import { MagnetSignGuard } from "@/guards/magnetSign.guard";
import { CacheGuard } from "@/guards/cache.guard";

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
    @Headers("range") rangeHeader: string,
    @Query() downloadFileDto: DownloadFileDto & { name: string; sig: string },
    @Res() res: Response,
  ) {
    const length = await this.torrentService.fileLength(downloadFileDto);
    const ranges: { start: number; end: number }[] | number = rangeParse(
      length,
      rangeHeader,
    );
    if (ranges < 0 && rangeHeader)
      throw new HttpException(
        "Invalid range",
        HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
      );

    const { start, end } = ranges[0] || { start: 0, end: length };
    res.setHeader("content-length", end - start + 1);
    if (end - start !== length - 1) {
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

    stream.pipe(res).once("close", () => stream.destroy());
  }

  @Get("subtitles")
  @UseGuards(CacheGuard)
  async getSubtitles(
    @Query() getSubtitlesDto: GetSubtitlesDto & { sig: string },
  ) {
    return await this.playerService.getSubtitles(getSubtitlesDto);
  }

  @Get("subtitle")
  @Header("content-type", "text/vtt")
  @UseGuards(CacheGuard)
  async getSubtitle(
    @Query()
    getSubtitleDto: GetSubtitleDto & { sig: string },
    @Res() res: Response,
  ) {
    (await this.playerService.getSubtitle(getSubtitleDto)).pipe(res);
  }
}
