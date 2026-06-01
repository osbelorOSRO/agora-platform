import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class N8nOfferEventCreateDto {
  @ApiProperty({
    description:
      'ID de sesión del thread al que pertenece el evento de oferta.',
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  sessionId!: string;

  @ApiProperty({
    description: 'Etapa actual del pipeline al crear el evento.',
    maxLength: 64,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  stageActual!: string;

  @ApiProperty({
    description: 'Tipo de oferta.',
    enum: ['alta', 'portabilidad'],
  })
  @IsString()
  @MinLength(1)
  @IsIn(['alta', 'portabilidad'])
  tipo!: string;

  @ApiProperty({ description: 'Código de la oferta.', maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  codigo!: string;

  @ApiPropertyOptional({
    description: 'Decisión inicial del cliente.',
    enum: ['acepta', 'objeta', 'rechaza', 'indefinido'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['acepta', 'objeta', 'rechaza', 'indefinido'])
  decision?: string;
}
