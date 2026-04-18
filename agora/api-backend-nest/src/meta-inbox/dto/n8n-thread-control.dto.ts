import { IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class N8nThreadControlDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sessionId?: string;

  @ValidateIf((o) => !o.sessionId)
  @IsString()
  @MaxLength(255)
  actorExternalId?: string;

  @ValidateIf((o) => !o.sessionId)
  @IsString()
  @IsIn(['PAGE', 'INSTAGRAM'])
  objectType?: string;

  @IsOptional()
  @IsString()
  @IsIn(['OPEN', 'PAUSED', 'ARCHIVED', 'CLOSED'])
  threadStatus?: string;

  @IsOptional()
  @IsString()
  @IsIn(['N8N', 'HUMAN', 'PAUSED'])
  attentionMode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  threadStage?: string;
}
