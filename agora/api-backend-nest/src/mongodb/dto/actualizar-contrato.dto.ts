import {
  IsString,
  IsOptional,
  IsNumber,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BiometriaDto } from './biometria.dto';
import { AbonadoDto } from './abonado.dto';

export class ActualizarContratoDto {
  @IsOptional()
  @IsString()
  orden?: string;

  @IsOptional()
  @IsString()
  fecha?: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  cod_plan?: string;

  @IsOptional()
  @IsNumber()
  cantidad_lineas?: number;

  @IsOptional()
  @IsString()
  modo?: string;

  @IsOptional()
  @IsString()
  ciclo?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  nombre_ejecutivo?: string;

  @IsOptional()
  @IsString()
  rut_ejecutivo?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BiometriaDto)
  biometria?: BiometriaDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AbonadoDto)
  abonados?: AbonadoDto[];
}
