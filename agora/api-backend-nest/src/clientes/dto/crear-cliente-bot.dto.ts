import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CrearClienteDesdeBotDto {
  @IsNotEmpty()
  @IsString()
  cliente_id: string;

  @IsNotEmpty()
  @IsString()
  tipo_id: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsUrl({}, { message: 'foto_perfil debe ser una URL válida' })
  foto_perfil?: string; // ✅ ahora el bot puede enviarla si ya la tiene
}
