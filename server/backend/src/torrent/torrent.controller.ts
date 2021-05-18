import {
  Controller,
  Get,
  Header,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response, Request } from "express";
import rangeParse from "range-parser";

import { DownloadFileDto } from "./dto/downloadFile.dto";
import { DownloadPlaylistDto } from "./dto/downloadPlaylist.dto";
import { ListFilesDto } from "./dto/listFiles.dto";
import { WaitDoneDto } from "./dto/waitDone";
import { TorrentService } from "./torrent.service";

import { MagnetSignGuard } from "@/guards/magnetSign.guard";
import { PreloadFileDto } from "./dto/preloadFile.dto";

@Controller("/api/torrent")
export class TorrentController {
  constructor(private torrentService: TorrentService) {}

  @Get("download/:name")
  @Header("connection", "close")
  @Header("accept-ranges", "bytes")
  @Header("content-type", "application/octet-stream")
  @UseGuards(MagnetSignGuard)
  async download(
    @Headers("range") rangeHeader: string,
    @Query() downloadFileDto: Omit<DownloadFileDto, "name"> & { sig: string },
    @Param("name") name: string,
    @Res() res: Response,
  ) {
    const length = await this.torrentService.fileLength({
      ...downloadFileDto,
      name,
    });
    const ranges: { start: number; end: number }[] | number = rangeParse(
      length,
      rangeHeader || "",
    );

    if (rangeHeader && (ranges < 0 || (ranges as any[]).length > 1))
      throw new HttpException(
        "Invalid range",
        HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
      );

    const { start, end } = ranges[0] || { start: 0, end: length };

    const stream = await this.torrentService.downloadFile({
      ...downloadFileDto,
      name,
      start,
      end,
    });

    res.setHeader("content-length", end - start);
    if (end - start !== length) {
      res.setHeader(
        "content-range",
        "bytes " + start + "-" + end + "/" + length,
      );
      res.status(206);
    }

    res.setHeader(
      "content-disposition",
      (downloadFileDto.disposition === "attachment" ? "attachment" : "inline") +
        `; filename="${name}"`,
    );

    stream.pipe(res).once("close", () => stream.destroy());
  }

  @Get("files")
  @Header("content-type", "application/json")
  @UseGuards(MagnetSignGuard)
  async files(@Query() listFilesDto: ListFilesDto & { sig: string }) {
    return await this.torrentService.listFiles(listFilesDto);
  }

  @Get("playlist")
  @Header("content-type", "audio/x-mpegurl")
  @UseGuards(MagnetSignGuard)
  async playlist(
    @Query() downloadPlayListDto: DownloadPlaylistDto & { sig: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { filename, content } = await this.torrentService.downloadPlaylist(
      downloadPlayListDto,
      {
        proto: req.protocol,
        host: req.hostname,
      },
    );

    res.setHeader("content-disposition", `inline; filename="${filename}"`);
    res.send(content);
  }

  @Get("preload")
  @Header("content-length", "100")
  @UseGuards(MagnetSignGuard)
  async preload(
    @Query() preloadFileDto: PreloadFileDto & { sig: string },
    @Res() res: Response,
  ) {
    const stream = await this.torrentService.preloadFile(preloadFileDto);
    stream.pipe(res).once("close", () => stream.destroy());
  }

  @Get("status")
  @Header("content-type", "application/json")
  async status() {
    return await this.torrentService.status();
  }

  @Get("verify")
  @UseGuards(MagnetSignGuard)
  async verify(
    @Query() downloadFileDto: DownloadFileDto & { sig: string },
    @Res() res: Response,
  ) {
    const stream = await this.torrentService.downloadFile({
      ...downloadFileDto,
      start: 0,
      end: 1,
    });
    stream.once("data", () => res.status(204).send(true));
  }

  @Get("done")
  @UseGuards(MagnetSignGuard)
  async done(@Query() waitDoneDto: WaitDoneDto & { sig: string }) {
    await this.torrentService.waitDone(waitDoneDto);
  }
}
