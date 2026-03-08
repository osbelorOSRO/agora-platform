// src/clientes/dto/notificar-cambio-estado.dto.ts
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class NotificarCambioEstadoDto {
  @IsNotEmpty()
  @IsString()
  cliente_id: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  nuevo_estado: number;

  @IsNotEmpty()
  @IsString()
  nueva_etiqueta: string;
}
