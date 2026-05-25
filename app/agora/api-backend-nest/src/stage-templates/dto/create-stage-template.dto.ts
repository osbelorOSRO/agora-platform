import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const ACCION_VALUES = [
  'enviar',
  'delegar',
  'negociar',
  'rechazar',
  'avanzar',
] as const;
const DECISION_VALUES = ['offer', 'scraper', 'handoff', 'reiniciar'] as const;
const MODO_DEFAULT_VALUES = [
  'alta',
  'portabilidad_postpago',
  'habilitacion',
] as const;

export class CreateStageTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  stage_actual: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(32767)
  posicion?: number;

  @IsString()
  @MinLength(1)
  posibles_match: string;

  @IsOptional()
  @IsBoolean()
  es_fallback?: boolean;

  @IsOptional()
  @IsBoolean()
  procesa_datos?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  dato_esperado?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  nuevo_stage: string;

  @IsString()
  @MinLength(1)
  tipo_respuesta: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  stage_route?: string;

  @IsOptional()
  @IsIn(MODO_DEFAULT_VALUES)
  modo_default?: string;

  @IsOptional()
  @IsBoolean()
  factible?: boolean;

  @IsOptional()
  @IsIn(DECISION_VALUES)
  decision?: string;

  @IsOptional()
  @IsIn(ACCION_VALUES)
  accion?: string;
}
