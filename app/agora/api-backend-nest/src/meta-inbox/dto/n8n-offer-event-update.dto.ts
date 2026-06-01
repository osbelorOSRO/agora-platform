import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class N8nOfferEventUpdateDto {
  @ApiPropertyOptional({
    description: 'ID de sesión del thread del evento a actualizar.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Etapa actual del pipeline.',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  stageActual?: string;

  @ApiPropertyOptional({
    description: 'Tipo de oferta.',
    enum: ['alta', 'portabilidad'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['alta', 'portabilidad'])
  tipo?: string;

  @ApiPropertyOptional({ description: 'Código de la oferta.', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  codigo?: string;

  @ApiPropertyOptional({
    description: 'Nueva decisión del cliente.',
    enum: ['acepta', 'objeta', 'rechaza', 'indefinido'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['acepta', 'objeta', 'rechaza', 'indefinido'])
  decision?: string;
}
