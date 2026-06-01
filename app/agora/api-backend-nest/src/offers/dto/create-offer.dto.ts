import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({ description: 'Código único de la oferta.', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  codigo: string;

  @ApiPropertyOptional({ description: 'Nombre de la oferta.' })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({ description: 'Precio base.', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precio_base?: number;

  @ApiPropertyOptional({ description: 'Tipo de oferta.', enum: TIPO_VALUES })
  @IsOptional()
  @IsIn(TIPO_VALUES)
  tipo?: string;

  @ApiPropertyOptional({ description: 'Descripción.' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Cantidad de líneas.', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  lineas?: number;

  @ApiPropertyOptional({ description: 'Si excluye altas.' })
  @IsOptional()
  @IsBoolean()
  excluye_alta?: boolean;

  @ApiPropertyOptional({ description: 'Si excluye portabilidad postpago.' })
  @IsOptional()
  @IsBoolean()
  excluye_portabilidad_postpago?: boolean;

  @ApiPropertyOptional({
    description: 'URL del archivo asociado.',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  url_archivo?: string;

  @ApiPropertyOptional({
    description: 'Precio normal (sin promoción).',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  precio_normal?: number;

  @ApiPropertyOptional({ description: 'Duración del precio promocional.' })
  @IsOptional()
  @IsString()
  duracion_precio?: string;

  @ApiPropertyOptional({ description: 'Gigas incluidos.', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  gigas?: number;

  @ApiPropertyOptional({ description: 'Minutos incluidos.' })
  @IsOptional()
  @IsString()
  minutos?: string;

  @ApiPropertyOptional({ description: 'Si incluye redes sociales libres.' })
  @IsOptional()
  @IsBoolean()
  tiene_redes_libres?: boolean;

  @ApiPropertyOptional({ description: 'Detalle de roaming.' })
  @IsOptional()
  @IsString()
  roaming?: string;
}
