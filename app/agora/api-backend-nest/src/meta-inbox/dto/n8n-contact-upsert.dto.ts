import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class N8nContactUpsertDto {
  @ApiPropertyOptional({
    description:
      'ID de sesión del thread. Si se envía, identifica el contacto; si no, usar actorExternalId + objectType.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'ID externo del actor (requerido si no se envía sessionId).',
    maxLength: 255,
  })
  @ValidateIf((o) => !o.sessionId)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  actorExternalId?: string;

  @ApiPropertyOptional({
    description: 'Canal del contacto (requerido si no se envía sessionId).',
    enum: ['PAGE', 'INSTAGRAM', 'WHATSAPP'],
  })
  @ValidateIf((o) => !o.sessionId)
  @IsString()
  @MinLength(1)
  @IsIn(['PAGE', 'INSTAGRAM', 'WHATSAPP'])
  objectType?: string;

  @ApiPropertyOptional({ description: 'Nombre visible.', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @ApiPropertyOptional({ description: 'Nombre.', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Apellido.', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto.', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'RUT del contacto.', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  rut?: string;

  @ApiPropertyOptional({ description: 'Dirección.', maxLength: 250 })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  address?: string;

  @ApiPropertyOptional({ description: 'Email del contacto.', maxLength: 200 })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ description: 'Notas libres.', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Ciudad.', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @ApiPropertyOptional({ description: 'Región.', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string;
}
