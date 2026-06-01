import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsBoundedJson } from '../../meta-inbox/dto/json-size.validator';

export class FcaIngressEnvelopeDto {
  @ApiProperty({
    description: 'ID único del evento externo (idempotencia).',
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  externalEventId!: string;

  @ApiProperty({
    description:
      'ID externo del actor (usuario de Facebook) origen del evento.',
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  actorExternalId!: string;

  @ApiProperty({ description: 'Proveedor del evento.', enum: ['FCA'] })
  @IsString()
  @IsIn(['FCA'])
  provider!: 'FCA';

  @ApiProperty({ description: 'Tipo de objeto origen.', enum: ['FACEBOOK'] })
  @IsString()
  @IsIn(['FACEBOOK'])
  objectType!: 'FACEBOOK';

  @ApiProperty({
    description: 'Pipeline destino del evento.',
    enum: ['MESSAGES'],
  })
  @IsString()
  @IsIn(['MESSAGES'])
  pipeline!: 'MESSAGES';

  @ApiProperty({
    description: 'Tipo de evento de mensajería.',
    enum: ['messaging.message', 'messaging.reaction', 'messaging.unsupported'],
  })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @IsIn(['messaging.message', 'messaging.reaction', 'messaging.unsupported'])
  eventType!: string;

  @ApiProperty({
    description: 'Fecha/hora en que ocurrió el evento (ISO 8601).',
    example: '2026-01-15T10:00:00.000Z',
  })
  @IsString()
  @MinLength(1)
  occurredAt!: string;

  @ApiPropertyOptional({
    description: 'Fecha/hora de recepción en el bridge (ISO 8601).',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  receivedAt?: string;

  @ApiProperty({
    description:
      'Payload del evento (JSON acotado, máx 512KB / profundidad 10).',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsBoundedJson({ maxBytes: 512000, maxDepth: 10 })
  payload!: Record<string, unknown>;
}
