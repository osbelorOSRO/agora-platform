import { IsNotEmpty, IsString } from 'class-validator';

export class VerificarClienteDto {
  @IsNotEmpty()
  @IsString()
  cliente_id: string;

  @IsNotEmpty()
  @IsString()
  tipo_id: string;
}
