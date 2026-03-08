import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class MsgDelegationFailedDto {
  @IsString()
  externalEventId!: string;

  @IsString()
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
  metadata?: any;
}
