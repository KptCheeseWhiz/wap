import { IsMagnetURI, IsNotEmpty, IsString } from "class-validator";

export class PreloadFileDto {
  @IsMagnetURI()
  @IsNotEmpty()
  readonly magnet: string;

  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  readonly path: string;
}
