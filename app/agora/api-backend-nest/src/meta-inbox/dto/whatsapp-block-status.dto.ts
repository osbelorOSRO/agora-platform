import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class WhatsappBlockStatusDto {
  @IsString()
  @IsIn(['block', 'unblock'])
  action!: 'block' | 'unblock';

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  actorExternalId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  phone?: string;
}
