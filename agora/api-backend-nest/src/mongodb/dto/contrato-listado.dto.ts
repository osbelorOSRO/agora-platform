import { IsString, IsOptional } from 'class-validator';

export class ContratoListadoDto {
  @IsString()
  contrato_id: string;

  @IsString()
  fecha: string; // formato dd-mm-yyyy
}
