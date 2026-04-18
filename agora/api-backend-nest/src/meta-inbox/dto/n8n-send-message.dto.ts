import { IsIn, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class N8nSendMessageDto {
  @ValidateIf((o) => !o.actorExternalId)
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

  @ValidateIf((o) => !o.mediaUrl)
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text?: string;

  @ValidateIf((o) => !o.text)
  @IsString()
  @MaxLength(4000)
  mediaUrl?: string;

  @ValidateIf((o) => !!o.mediaUrl)
  @IsString()
  @IsIn(['audio', 'image'])
  mediaType?: 'audio' | 'image';
}
