import { IsMagnetURI, IsNotEmpty, IsString } from "class-validator";

export class DownloadPlayoneDto {
  @IsMagnetURI()
  @IsNotEmpty()
  readonly magnet: string;

  @IsString()
  @IsNotEmpty()
  readonly filepath: string;

  @IsString()
  @IsNotEmpty()
  readonly sig: string;
}
