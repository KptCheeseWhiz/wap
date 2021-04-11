import { IsMagnetURI, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class DownloadPlaylistDto {
  @IsMagnetURI()
  @IsNotEmpty()
  readonly magnet: string;

  @IsString()
  @IsOptional()
  readonly name?: string;

  @IsString()
  @IsOptional()
  readonly path?: string;

  @IsString()
  @IsNotEmpty()
  readonly sig: string;
}
