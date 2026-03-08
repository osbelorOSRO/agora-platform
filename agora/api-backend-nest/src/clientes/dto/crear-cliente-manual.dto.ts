import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CrearClienteManualDto {
  @IsOptional()
  @IsString()
  cliente_id: string;

  @IsOptional()
  @IsString()
  tipo_id: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsUrl({}, { message: 'foto_perfil debe ser una URL válida' })
  foto_perfil?: string; // ✅ para recibir avatar en creación manual
}
