import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class MsgDelegationCompleteDto {
  @ApiProperty({
    description: 'ID del evento externo que originó la delegación.',
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  externalEventId!: string;

  @ApiProperty({
    description: 'ID externo del actor (conversación) delegado.',
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  actorExternalId!: string;

  @ApiPropertyOptional({
    description: 'Si la automatización detectó una señal accionable.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  hasSignal?: boolean;

  @ApiPropertyOptional({
    description: 'Tipo de señal detectada por la automatización.',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  signalType?: string;

  @ApiPropertyOptional({
    description:
      'Metadata libre del resultado. Acepta objeto o string JSON (se parsea).',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return { raw: value };
    }
  })
  @IsObject()
  metadata?: Record<string, unknown>;
}
