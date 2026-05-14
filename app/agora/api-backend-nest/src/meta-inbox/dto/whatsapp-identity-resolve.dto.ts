import { IsOptional, IsString, MaxLength } from 'class-validator';

export class WhatsappIdentityResolveDto {
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
