import { IsString, IsNotEmpty } from 'class-validator';

export class CrearEtiquetaDto {
  @IsNotEmpty()
  @IsString()
  nombre_etiqueta: string;
}
