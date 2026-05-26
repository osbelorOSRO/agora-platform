import { IsInt, Max, Min } from 'class-validator';

export class CreatePriceLevelDto {
  @IsInt()
  @Min(1)
  @Max(9)
  level: number;

  @IsInt()
  @Min(1)
  @Max(3)
  range: number;

  @IsInt()
  @Min(0)
  price: number;
}
