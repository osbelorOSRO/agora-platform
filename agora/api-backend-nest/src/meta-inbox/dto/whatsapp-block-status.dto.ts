import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class WhatsappBlockStatusDto {
  @IsIn(['block', 'unblock'])
  action!: 'block' | 'unblock';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  actorExternalId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;
}
