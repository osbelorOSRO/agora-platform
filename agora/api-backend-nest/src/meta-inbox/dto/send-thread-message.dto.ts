import { IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export type ThreadMessageSenderType = 'HUMAN' | 'N8N' | 'SYSTEM';
export type ThreadMessageMediaType = 'image' | 'audio' | 'document' | 'video';

export class SendThreadMessageDto {
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
  @IsIn(['PAGE', 'INSTAGRAM', 'WHATSAPP'])
  objectType?: string;

  @IsOptional()
  @IsString()
  @IsIn(['HUMAN', 'N8N', 'SYSTEM'])
  senderType?: ThreadMessageSenderType;

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
  @IsIn(['image', 'audio', 'document', 'video'])
  mediaType?: ThreadMessageMediaType;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  caption?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  mimeType?: string;
}
