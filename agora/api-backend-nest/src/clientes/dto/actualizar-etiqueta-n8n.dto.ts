import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class ActualizarEtiquetaN8nDto {
  @IsNotEmpty()
  @Type(() => Number)
  etiqueta_id: number;

  @IsNotEmpty()  // 🔥 OBLIGATORIO
  @IsString()
  fuente: string;  // 🔥 NUEVO CAMPO

  @IsOptional()
  @Type(() => Number)
  proceso_id?: number;

  @IsOptional()
  @Type(() => Date)  // Usamos @Type(() => Date) para convertir el campo fecha correctamente
  fecha?: Date;  // Aquí recibimos la fecha como un Date
}
