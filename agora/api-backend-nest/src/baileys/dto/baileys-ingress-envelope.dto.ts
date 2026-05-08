import { Type } from 'class-transformer';
import { IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { IsBoundedJson } from '../../meta-inbox/dto/json-size.validator';

export class BaileysIngressEnvelopeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  externalEventId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  actorExternalId!: string;

  @IsString()
  @IsIn(['BAILEYS'])
  provider!: 'BAILEYS';

  @IsString()
  @IsIn(['WHATSAPP'])
  objectType!: 'WHATSAPP';

  @IsString()
  @IsIn(['MESSAGES'])
  pipeline!: 'MESSAGES';

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @IsIn(['messaging.message', 'messaging.reaction', 'messaging.unsupported'])
  eventType!: string;

  @IsString()
  @MinLength(1)
  occurredAt!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  receivedAt?: string;

  @IsObject()
  @IsBoundedJson({ maxBytes: 512000, maxDepth: 10 })
  payload!: Record<string, unknown>;
}
