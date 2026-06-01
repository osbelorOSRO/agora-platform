import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdatePriceLevelDto {
  @ApiPropertyOptional({ description: 'Precio en pesos.', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;
}
