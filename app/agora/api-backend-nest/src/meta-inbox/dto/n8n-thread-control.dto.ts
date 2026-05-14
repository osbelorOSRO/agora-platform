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
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sessionId?: string;

  @ValidateIf((o) => !o.sessionId)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  actorExternalId?: string;

  @ValidateIf((o) => !o.sessionId)
  @IsString()
  @MinLength(1)
  @IsIn(['PAGE', 'INSTAGRAM', 'WHATSAPP'])
  objectType?: string;

  @IsOptional()
  @IsString()
  @IsIn(['OPEN', 'PAUSED', 'ARCHIVED', 'CLOSED'])
  threadStatus?: string;

  @IsOptional()
  @IsString()
  @IsIn(['N8N', 'HUMAN', 'SYSTEM', 'PAUSED'])
  attentionMode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  threadStage?: string;

  @IsOptional()
  @IsObject()
  @IsBoundedJson({ maxBytes: 4096, maxDepth: 4 })
  stageControl?: Record<string, unknown>;
}
