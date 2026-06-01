import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class ActualizarUsuarioDto {
  @ApiPropertyOptional({ description: 'Nombre del usuario.', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @ApiPropertyOptional({ description: 'Apellido del usuario.', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  apellido?: string;

  @ApiPropertyOptional({ description: 'RUN del usuario.', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  run?: string;

  @ApiPropertyOptional({ description: 'Email del usuario.', maxLength: 200 })
  @IsOptional()
  @ValidateIf((o) => !!o.email)
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ description: 'Teléfono del usuario.', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @ApiPropertyOptional({ description: 'ID del rol a asignar.', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  rolId?: number;

  @ApiPropertyOptional({
    description: 'Rol como objeto { id } (alternativa a rolId).',
    type: 'object',
    properties: { id: { type: 'number' } },
  })
  @IsOptional()
  @IsObject()
  rol?: { id: number };
}
