import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class CreatePriceLevelDto {
  @ApiProperty({ description: 'Nivel (1 a 9).', minimum: 1, maximum: 9 })
  @IsInt()
  @Min(1)
  @Max(9)
  level: number;

  @ApiProperty({
    description: 'Rango de precio (1 a 3).',
    minimum: 1,
    maximum: 3,
  })
  @IsInt()
  @Min(1)
  @Max(3)
  range: number;

  @ApiProperty({ description: 'Precio en pesos.', minimum: 0 })
  @IsInt()
  @Min(0)
  price: number;
}
