import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class VerifyMetaWebhookQueryDto {
  @ApiProperty({
    name: 'hub.mode',
    description: 'Modo del handshake de verificación de Meta.',
    example: 'subscribe',
    maxLength: 40,
  })
  @IsString()
  @MaxLength(40)
  ['hub.mode']!: string;

  @ApiProperty({
    name: 'hub.challenge',
    description:
      'Challenge que se debe devolver tal cual para confirmar el webhook.',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  ['hub.challenge']!: string;

  @ApiProperty({
    name: 'hub.verify_token',
    description: 'Token de verificación configurado en la app de Meta.',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  ['hub.verify_token']!: string;
}
