import { Controller, Get, Query } from "@nestjs/common";

import { SearchCategoriesDto } from "./dto/searchCategories.dto";
import { SearchColumnsDto } from "./dto/searchColumns.dto";
import { SearchTorrentDto } from "./dto/searchTorrent.dto";
import { SearcherService } from "./searcher.service";

@Controller("/api/search")
export class SearcherController {
  constructor(private searcherService: SearcherService) {}

  @Get()
  async search(@Query() searchTorrentDto: SearchTorrentDto) {
    return this.searcherService.search(searchTorrentDto);
  }

  @Get("columns")
  async columns(@Query() searchColumnsDto: SearchColumnsDto) {
    return this.searcherService.columns(searchColumnsDto);
  }

  @Get("categories")
  async categories(@Query() searchCategoriesDto: SearchCategoriesDto) {
    return this.searcherService.categories(searchCategoriesDto);
  }
}
