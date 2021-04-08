import { IsNotEmpty, IsString } from "class-validator";

export class SearchColumnsDto {
  @IsString()
  @IsNotEmpty()
  readonly engine: string;
}
