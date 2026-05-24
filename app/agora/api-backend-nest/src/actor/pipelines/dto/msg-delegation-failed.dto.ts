import { Transform } from 'class-transformer';
import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class MsgDelegationFailedDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  externalEventId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  actorExternalId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

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
