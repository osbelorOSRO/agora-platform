import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class N8nOfferEventQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por ID de sesión del thread.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por código de oferta.',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  codigo?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por decisión del cliente.',
    enum: ['acepta', 'objeta', 'rechaza', 'indefinido'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['acepta', 'objeta', 'rechaza', 'indefinido'])
  decision?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por etapa actual.',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  stageActual?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por tipo de oferta.',
    enum: ['alta', 'portabilidad'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['alta', 'portabilidad'])
  tipo?: string;
}
