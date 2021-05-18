import { URL } from "url";

import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { JSDOM } from "jsdom";
import fetch from "node-fetch";

import { SearchTorrentDto } from "./dto/searchTorrent.dto";
import { SearchCategoriesDto } from "./dto/searchCategories.dto";
import { SearchColumnsDto } from "./dto/searchColumns.dto";

import { CryptoService } from "@/crypto/crypto.service";

@Injectable()
export class SearcherService {
  constructor(private cryptoService: CryptoService) {}

  async search(searchTorrentDto: SearchTorrentDto) {
    if (["nyaa"].indexOf(searchTorrentDto.engine) === -1)
      throw new HttpException("Engine not found", HttpStatus.NOT_FOUND);
    return await this[searchTorrentDto.engine]({
      query: searchTorrentDto.query,
      category: searchTorrentDto.category,
      filter: searchTorrentDto.filter,
      sort: searchTorrentDto.sort,
      order: searchTorrentDto.order,
      page: searchTorrentDto.page,
    });
  }

  categories(
    searchCategoriesDto: SearchCategoriesDto,
  ): { name: string; value: string }[] {
    switch (searchCategoriesDto.engine) {
      case "nyaa":
        return [{ name: "All categories", value: "0_0" }];
      default:
        throw new HttpException("Engine not found", HttpStatus.NOT_FOUND);
    }
  }

  columns(
    seachColumnsDto: SearchColumnsDto,
  ): { name: string; value: string; sortable: boolean }[] {
    switch (seachColumnsDto.engine) {
      case "nyaa":
        return [
          {
            name: "Category",
            value: "category",
            sortable: false,
          },
          {
            name: "Title",
            value: "title",
            sortable: false,
          },
          {
            name: "Size",
            value: "size",
            sortable: true,
          },
          {
            name: "Date",
            value: "id", // ¯\_(ツ)_/¯
            sortable: true,
          },
          {
            name: "Seeders",
            value: "seeders",
            sortable: true,
          },
          {
            name: "Leechers",
            value: "leechers",
            sortable: true,
          },
          {
            name: "Downloads",
            value: "downloads",
            sortable: true,
          },
        ];
      default:
        throw new HttpException("Engine not found", HttpStatus.NOT_FOUND);
    }
  }

  private async nyaa({
    query,
    category,
    filter,
    sort,
    order,
    page,
  }: {
    query: string;
    category: string;
    filter: string;
    sort: string;
    order: string;
    page: number;
  }): Promise<{
    from: number;
    to: number;
    total: number;
    page: number;
    per_page: number;
    results: {
      title: string;
      download: string;
      magnet: string;
      sig: string;

      [key: string]: any;
    }[];
  }> {
    const url = new URL("https://nyaa.si");
    url.searchParams.append("q", query || "");
    url.searchParams.append("c", category || "0_0");
    url.searchParams.append("f", (+filter || 0).toString());
    url.searchParams.append("p", (page || 1).toString());
    url.searchParams.append("s", sort || "");
    url.searchParams.append("o", order || "desc");

    const window = await fetch(url, {
      headers: {
        "User-Agent": "WAP (+https://github.com/KptCheeseWhiz/wap)",
      },
    })
      .then((resp) => resp.text())
      .then((text) => new JSDOM(text))
      .then(({ window }) => window);

    const pagination =
      window.document.querySelector(".pagination-page-info")?.textContent || "";

    const rexec = /([0-9]+?)-([0-9]+?) out of ([0-9]+?) result/.exec(
      pagination,
    );
    if (!rexec) throw new Error("invalid pagination");
    const [from, to, total] = [
      Number(rexec[1]),
      Number(rexec[2]),
      Number(rexec[3]),
    ];

    const trs = [
      ...window.document.querySelectorAll(".torrent-list tbody tr"),
    ] as HTMLTableRowElement[];

    return {
      from,
      to,
      total,
      page,
      per_page: 75,
      results: trs.map((tr, i) => {
        const [
          td_category,
          td_title,
          td_dl_mg,
          td_size,
          td_date,
          td_seeders,
          td_leechers,
          td_downloads,
        ] = [...tr.querySelectorAll("td")] as HTMLTableCellElement[];

        const category = td_category.querySelector("a")?.getAttribute("title");
        const title = td_title
          .querySelector("a:last-child")
          ?.getAttribute("title");
        const download = td_dl_mg
          .querySelector("a:first-child")
          ?.getAttribute("href");

        const magnet = decodeURIComponent(
          td_dl_mg.querySelector("a:last-child")?.getAttribute("href"),
        );
        const size = td_size.textContent;
        const date = new Date(
          Number(td_date.getAttribute("data-timestamp")) * 1000,
        );
        const seeders = Number(td_seeders.textContent);
        const leechers = Number(td_leechers.textContent);
        const downloads = Number(td_downloads.textContent);

        if (
          !category ||
          !title ||
          !download ||
          !magnet ||
          !size ||
          isNaN(date.valueOf()) ||
          isNaN(seeders) ||
          isNaN(leechers) ||
          isNaN(downloads)
        )
          throw new Error("invalid entry " + page + ":" + i);

        return {
          title,
          download: "https://nyaa.si" + download,
          magnet,
          sig: this.cryptoService.sign(magnet),

          category,
          size,
          id: date,
          seeders,
          leechers,
          downloads,
        };
      }),
    };
  }
}
