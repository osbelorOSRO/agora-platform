import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class MsgDelegationCompleteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  externalEventId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  actorExternalId!: string;

  @IsOptional()
  @IsBoolean()
  hasSignal?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
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
  @IsObject()
  metadata?: Record<string, unknown>;
}
