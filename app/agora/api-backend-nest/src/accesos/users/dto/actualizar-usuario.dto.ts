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
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  apellido?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  run?: string;

  @IsOptional()
  @ValidateIf((o) => !!o.email)
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  rolId?: number;

  @IsOptional()
  @IsObject()
  rol?: { id: number };
}
