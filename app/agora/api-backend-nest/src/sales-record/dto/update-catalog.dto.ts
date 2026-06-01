import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateCatalogDto {
  @ApiPropertyOptional({
    description: 'Nivel de la oferta (1 a 9).',
    minimum: 1,
    maximum: 9,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  level?: number;

  @ApiPropertyOptional({
    description: 'Puntaje de la oferta.',
    enum: [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0],
  })
  @IsOptional()
  @IsIn([0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0])
  points?: number;
}
