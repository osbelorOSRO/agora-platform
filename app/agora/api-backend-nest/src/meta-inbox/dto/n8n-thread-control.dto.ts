import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IsBoundedJson } from './json-size.validator';

export class N8nThreadControlDto {
  @ApiPropertyOptional({
    description:
      'ID de sesión del thread. Si se envía, identifica el thread directamente; si no, usar actorExternalId + objectType.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'ID externo del actor (requerido si no se envía sessionId).',
    maxLength: 255,
  })
  @ValidateIf((o) => !o.sessionId)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  actorExternalId?: string;

  @ApiPropertyOptional({
    description: 'Canal del thread (requerido si no se envía sessionId).',
    enum: ['PAGE', 'INSTAGRAM', 'WHATSAPP'],
  })
  @ValidateIf((o) => !o.sessionId)
  @IsString()
  @MinLength(1)
  @IsIn(['PAGE', 'INSTAGRAM', 'WHATSAPP'])
  objectType?: string;

  @ApiPropertyOptional({
    description: 'Nuevo estado del thread.',
    enum: ['OPEN', 'PAUSED', 'ARCHIVED', 'CLOSED'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['OPEN', 'PAUSED', 'ARCHIVED', 'CLOSED'])
  threadStatus?: string;

  @ApiPropertyOptional({
    description: 'Quién atiende el thread (modo de atención).',
    enum: ['N8N', 'HUMAN', 'SYSTEM', 'PAUSED'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['N8N', 'HUMAN', 'SYSTEM', 'PAUSED'])
  attentionMode?: string;

  @ApiPropertyOptional({
    description: 'Etapa (stage) del thread en el pipeline conversacional.',
    maxLength: 64,
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  threadStage?: string;

  @ApiPropertyOptional({
    description:
      'Control de stage adicional (JSON acotado, máx 4KB / profundidad 4).',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  @IsBoundedJson({ maxBytes: 4096, maxDepth: 4 })
  stageControl?: Record<string, unknown>;
}
