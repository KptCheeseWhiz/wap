import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from "class-validator";

export class SearchTorrentDto {
  @IsString()
  @IsNotEmpty()
  readonly engine: string;

  @IsString()
  @IsNotEmpty()
  readonly query: string;

  @IsOptional()
  readonly category?: string;

  @IsOptional()
  readonly filter?: string;

  @IsOptional()
  readonly sort?: string;

  @IsOptional()
  readonly order?: string;

  @IsOptional()
  @IsNumberString({ no_symbols: true })
  readonly page?: number;
}
