import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateWhatsappContactDto {
  @ApiProperty({
    description: 'Teléfono del contacto de WhatsApp.',
    maxLength: 50,
    example: '56912345678',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  phone: string;

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

  @ApiPropertyOptional({ description: 'RUT.', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  rut?: string;

  @ApiPropertyOptional({ description: 'Dirección.', maxLength: 250 })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  address?: string;

  @ApiPropertyOptional({ description: 'Email.', maxLength: 200 })
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
