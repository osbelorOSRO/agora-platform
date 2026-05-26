import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdatePriceLevelDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;
}
