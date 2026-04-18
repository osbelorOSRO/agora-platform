import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateThreadControlDto {
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
