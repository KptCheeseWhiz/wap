import { IsNotEmpty, IsString } from "class-validator";

export class SearchCategoriesDto {
  @IsString()
  @IsNotEmpty()
  readonly engine: string;
}
