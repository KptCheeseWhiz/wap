import { IsMagnetURI, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class DownloadPlaylistDto {
  @IsMagnetURI()
  @IsNotEmpty()
  readonly magnet: string;

  @IsString()
  @IsOptional()
  readonly filename?: string;

  @IsString()
  @IsNotEmpty()
  readonly sig: string;
}
