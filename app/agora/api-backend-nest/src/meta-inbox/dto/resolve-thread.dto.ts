import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResolveThreadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  actorExternalId!: string;

  @IsString()
  @MinLength(1)
  @IsIn(['PAGE', 'INSTAGRAM', 'WHATSAPP'])
  objectType!: string;

  @IsOptional()
  @IsBoolean()
  includeClosed?: boolean;
}
