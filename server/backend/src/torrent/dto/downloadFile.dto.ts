import { IsMagnetURI, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class DownloadFileDto {
  @IsMagnetURI()
  @IsNotEmpty()
  readonly magnet: string;

  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  readonly path: string;

  @IsOptional()
  @IsString()
  readonly disposition?: string;

  @IsString()
  @IsNotEmpty()
  readonly sig: string;
}
