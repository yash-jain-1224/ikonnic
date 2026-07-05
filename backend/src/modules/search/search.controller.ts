import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Full text search across products and categories' })
  async search(@Query('q') query: string, @Query('limit') limit?: number) {
    return this.searchService.search(query, limit);
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Autocomplete suggestions' })
  async autocomplete(@Query('q') query: string) {
    return this.searchService.autocomplete(query);
  }
}
