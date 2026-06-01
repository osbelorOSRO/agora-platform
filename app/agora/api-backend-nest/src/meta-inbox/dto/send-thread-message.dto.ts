import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export type ThreadMessageSenderType = 'HUMAN' | 'N8N' | 'SYSTEM';
export type ThreadMessageMediaType = 'image' | 'audio' | 'document' | 'video';

export class SendThreadMessageDto {
  @ApiPropertyOptional({
    description:
      'ID de sesión del thread. Si se envía, identifica el thread; si no, usar actorExternalId + objectType.',
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
    description: 'Quién envía el mensaje.',
    enum: ['HUMAN', 'N8N', 'SYSTEM'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['HUMAN', 'N8N', 'SYSTEM'])
  senderType?: ThreadMessageSenderType;

  @ApiPropertyOptional({
    description: 'Texto del mensaje (requerido si no hay mediaUrl).',
    maxLength: 4000,
  })
  @ValidateIf((o) => !o.mediaUrl)
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text?: string;

  @ApiPropertyOptional({
    description: 'URL del archivo multimedia (requerido si no hay text).',
    maxLength: 4000,
  })
  @ValidateIf((o) => !o.text)
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  mediaUrl?: string;

  @ApiPropertyOptional({
    description: 'Tipo de multimedia (requerido si se envía mediaUrl).',
    enum: ['image', 'audio', 'document', 'video'],
  })
  @ValidateIf((o) => !!o.mediaUrl)
  @IsString()
  @IsIn(['image', 'audio', 'document', 'video'])
  mediaType?: ThreadMessageMediaType;

  @ApiPropertyOptional({
    description: 'Caption del multimedia.',
    maxLength: 4000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  caption?: string;

  @ApiPropertyOptional({ description: 'Nombre del archivo.', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @ApiPropertyOptional({
    description: 'MIME type del archivo.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  mimeType?: string;
}
