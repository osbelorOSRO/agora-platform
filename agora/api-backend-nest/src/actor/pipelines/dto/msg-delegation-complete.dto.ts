import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class MsgDelegationCompleteDto {
  @IsString()
  externalEventId!: string;

  @IsString()
  actorExternalId!: string;

  @IsOptional()
  @IsBoolean()
  hasSignal?: boolean;

  @IsOptional()
  @IsString()
  signalType?: string;

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
