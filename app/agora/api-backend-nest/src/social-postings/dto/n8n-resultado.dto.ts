import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class N8nResultadoDto {
  @IsString()
  @IsIn(['publicado', 'error'])
  estado: string;

  @IsOptional()
  @IsString()
  id_post?: string;

  @IsOptional()
  @IsObject()
  raw?: Record<string, unknown>;
}
