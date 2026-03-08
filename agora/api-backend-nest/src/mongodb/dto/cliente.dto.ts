import { IsString, IsOptional } from 'class-validator';

export class ClienteDto {
  @IsString()
  cliente_id: string;

  @IsOptional()
  @IsString()
  telefono?: string;
}
