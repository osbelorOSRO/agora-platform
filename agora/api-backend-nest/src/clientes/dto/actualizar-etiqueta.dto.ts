import { IsIn, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class ActualizarEtiquetaDto {
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  etiqueta_id: number;

  @IsNotEmpty()
  @IsIn(['bot', 'humano', 'panel'])
  fuente: 'bot' | 'humano' | 'panel';

  // ✅ Nuevo campo
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  proceso_id?: number;
}
