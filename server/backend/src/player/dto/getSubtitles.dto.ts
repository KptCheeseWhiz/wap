import {
  IsMagnetURI,
  IsNotEmpty,
  IsString,
  IsNumberString,
} from "class-validator";

export class GetSubtitlesDto {
  @IsMagnetURI()
  @IsNotEmpty()
  readonly magnet: string;

  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  readonly path: string;

  @IsNumberString()
  readonly index: number;
}
