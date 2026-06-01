import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class N8nOfferContextDto {
  @ApiProperty({
    description:
      'ID de sesión del thread sobre el que se calcula el contexto de oferta.',
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  sessionId!: string;

  @ApiPropertyOptional({
    description: 'Etapa actual del pipeline conversacional.',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  stageActual?: string;

  @ApiPropertyOptional({
    description: 'Modo de la oferta.',
    enum: ['alta', 'portabilidad', 'portabilidad_postpago'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['alta', 'portabilidad', 'portabilidad_postpago'])
  modo?: string;

  @ApiPropertyOptional({
    description: 'Decisión del cliente sobre la oferta.',
    enum: ['acepta', 'objeta', 'rechaza', 'indefinido'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['acepta', 'objeta', 'rechaza', 'indefinido'])
  decision?: string;

  @ApiPropertyOptional({
    description: 'ID de la oferta actual.',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  currentOfferId?: string;

  @ApiPropertyOptional({
    description: 'Código de la oferta actual.',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  currentCodigo?: string;

  @ApiPropertyOptional({
    description: 'Cantidad de líneas (1 a 5).',
    minimum: 1,
    maximum: 5,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  lineas?: number;
}
