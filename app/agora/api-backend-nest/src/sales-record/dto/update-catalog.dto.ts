import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateCatalogDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  level?: number;

  @IsOptional()
  @IsIn([0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0])
  points?: number;
}
