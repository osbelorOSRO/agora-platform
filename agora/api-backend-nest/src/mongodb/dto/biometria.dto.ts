import { IsString, IsOptional } from 'class-validator';

export class BiometriaDto {
  @IsOptional()
  @IsString()
  rut_cliente: string;

  @IsOptional()
  @IsString()
  nombre_cliente?: string;

  @IsOptional()
  @IsString()
  codigo_BO?: string;
}
