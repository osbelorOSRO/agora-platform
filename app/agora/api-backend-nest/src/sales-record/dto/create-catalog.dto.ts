import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { offer_modality } from '@prisma/client';

export class CreateCatalogDto {
  @ApiProperty({
    description: 'Código de la oferta en el catálogo.',
    maxLength: 20,
  })
  @IsString()
  @MaxLength(20)
  code: string;

  @ApiProperty({ description: 'Modalidad de la oferta.', enum: offer_modality })
  @IsEnum(offer_modality)
  modality: offer_modality;

  @ApiProperty({
    description: 'Nivel de la oferta (1 a 9).',
    minimum: 1,
    maximum: 9,
  })
  @IsInt()
  @Min(1)
  @Max(9)
  level: number;

  @ApiProperty({
    description: 'Puntaje de la oferta.',
    enum: [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0],
  })
  @IsIn([0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0])
  points: number;
}
