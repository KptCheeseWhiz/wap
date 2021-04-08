import { IsMagnetURI, IsNotEmpty, IsString } from "class-validator";

export class ListFilesDto {
  @IsMagnetURI()
  @IsNotEmpty()
  readonly magnet: string;

  @IsString()
  @IsNotEmpty()
  readonly sig: string;
}
