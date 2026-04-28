import { IsEmail, IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class N8nContactUpsertDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sessionId?: string;

  @ValidateIf((o) => !o.sessionId)
  @IsString()
  @MaxLength(255)
  actorExternalId?: string;

  @ValidateIf((o) => !o.sessionId)
  @IsString()
  @IsIn(['PAGE', 'INSTAGRAM', 'WHATSAPP'])
  objectType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  rut?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  address?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string;
}
