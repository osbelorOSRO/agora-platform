import { Type } from 'class-transformer';
import { IsInt, IsString, IsOptional } from 'class-validator';

export class CreateProcesoDto {
  @IsString()
  cliente_id: string;

  @Type(() => Number) // convierte string → number antes de validar
  @IsInt()
  iniciado_por_id: number;

  @IsOptional()
  @IsString()
  tipo_proceso?: string;
}

