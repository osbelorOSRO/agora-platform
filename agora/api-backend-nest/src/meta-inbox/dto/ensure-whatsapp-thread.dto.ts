import { IsString, MaxLength } from 'class-validator';

export class EnsureWhatsappThreadDto {
  @IsString()
  @MaxLength(255)
  actorExternalId: string;
}
