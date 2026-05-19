import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const TIPO_VALUES = ['individual', 'multilineas', 'adicional'] as const;

export class CreateOfferDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  codigo: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_base?: number;

  @IsOptional()
  @IsIn(TIPO_VALUES)
  tipo?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  lineas?: number;

  @IsOptional()
  @IsBoolean()
  excluye_alta?: boolean;

  @IsOptional()
  @IsBoolean()
  excluye_portabilidad_postpago?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  url_archivo?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  precio_normal?: number;

  @IsOptional()
  @IsString()
  duracion_precio?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  gigas?: number;

  @IsOptional()
  @IsString()
  minutos?: string;

  @IsOptional()
  @IsBoolean()
  tiene_redes_libres?: boolean;

  @IsOptional()
  @IsString()
  roaming?: string;
}
