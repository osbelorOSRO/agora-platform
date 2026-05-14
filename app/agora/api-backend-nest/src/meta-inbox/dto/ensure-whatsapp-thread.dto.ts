import { IsString, MaxLength, MinLength } from 'class-validator';

export class EnsureWhatsappThreadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  actorExternalId: string;
}
