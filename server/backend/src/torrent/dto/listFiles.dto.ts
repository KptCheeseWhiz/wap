import { IsMagnetURI, IsNotEmpty } from "class-validator";

export class ListFilesDto {
  @IsMagnetURI()
  @IsNotEmpty()
  readonly magnet: string;
}
