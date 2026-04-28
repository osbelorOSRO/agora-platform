import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveThreadDto {
  @IsString()
  @MaxLength(255)
  actorExternalId!: string;

  @IsString()
  @IsIn(['PAGE', 'INSTAGRAM', 'WHATSAPP'])
  objectType!: string;

  @IsOptional()
  @IsBoolean()
  includeClosed?: boolean;
}
