import { Transform } from 'class-transformer';
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class MsgDelegationFailedDto {
  @IsString()
  @MinLength(1)
  externalEventId!: string;

  @IsString()
  @MinLength(1)
  actorExternalId!: string;

  @IsOptional()
  @IsString()
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
  metadata?: any;
}
