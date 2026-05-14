import { IsString, MaxLength } from 'class-validator';

export class VerifyMetaWebhookQueryDto {
  @IsString()
  @MaxLength(40)
  ['hub.mode']!: string;

  @IsString()
  @MaxLength(255)
  ['hub.challenge']!: string;

  @IsString()
  @MaxLength(255)
  ['hub.verify_token']!: string;
}
