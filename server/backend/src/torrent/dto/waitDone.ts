import { IsMagnetURI, IsNotEmpty, IsString } from "class-validator";

export class WaitDoneDto {
  @IsMagnetURI()
  @IsNotEmpty()
  readonly magnet: string;

  @IsString()
  readonly name: string;

  @IsString()
  readonly path: string;
}
