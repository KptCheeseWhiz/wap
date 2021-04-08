import {
  Controller,
  Get,
  Header,
  Headers,
  HttpException,
  HttpStatus,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response, Request } from "express";

import { DownloadFileDto } from "./dto/downloadFile.dto";
import { ListFilesDto } from "./dto/listFiles.dto";
import { TorrentService } from "./torrent.service";
import { DownloadPlaylistDto } from "./dto/downloadPlaylist.dto";

import { MagnetSignGuard } from "@/guards/magnetSign.guard";
import { CacheTorrentGuard } from "@/guards/cacheTorrent.guard";

@Controller("/api/torrent")
export class TorrentController {
  constructor(private torrentService: TorrentService) {}

  @Get("files")
  @Header("content-type", "application/json")
  @UseGuards(CacheTorrentGuard, MagnetSignGuard)
  async listFiles(@Query() listFilesDto: ListFilesDto) {
    return await this.torrentService.listFiles(listFilesDto);
  }

  @Get("download")
  @Header("connection", "keep-alive")
  @Header("accept-ranges", "bytes")
  @UseGuards(MagnetSignGuard)
  async downloadFile(
    @Headers("range") range: string,
    @Query() downloadFileDto: DownloadFileDto,
    @Res() res: Response,
  ) {
    let start = 0,
      end = 0;

    if (range) {
      if (/^bytes[= ][0-9]+?-([0-9]+?)?$/.test(range)) {
        const regex = /^bytes[= ]([0-9]+?)-([0-9]+?)?$/.exec(range);
        if (regex) {
          if (regex[1]) start = Number(regex[1]);
          if (regex[2]) end = Number(regex[2]);
        }

        if (end && end < start)
          throw new HttpException(
            "Invalid byte range",
            HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
          );
      }
    }

    const { length, mime, stream } = await this.torrentService.downloadFile({
      ...downloadFileDto,
      start,
      end,
    });

    if (!end) end = length;

    res.setHeader(
      "content-disposition",
      (downloadFileDto.disposition === "attachment" ? "attachment" : "inline") +
        "; filename=" +
        downloadFileDto.filename,
    );
    res.setHeader("content-type", mime);
    res.setHeader("content-length", end - start);
    res.setHeader("content-range", "bytes " + start + "-" + end + "/" + length);

    res.status(end - start === length ? 200 : 206);

    stream.pipe(res.on("close", () => stream.destroy()));
  }

  @Get("playlist")
  @Header("content-type", "audio/x-mpegurl")
  @UseGuards(MagnetSignGuard)
  async downloadPlaylist(
    @Query() downloadPlayListDto: DownloadPlaylistDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { filename, content } = await this.torrentService.downloadPlaylist(
      downloadPlayListDto,
      {
        proto: (req.headers["x-forwarded-proto"] || "http") as string,
        host: (req.headers["x-forwarded-host"] || req.headers.host) as string,
      },
    );

    res.setHeader("content-disposition", "inline; filename=" + filename);
    res.send(content);
  }

  @Get("status")
  @Header("content-type", "application/json")
  async status() {
    return this.torrentService.status();
  }
}
