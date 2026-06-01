import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePosteoDto {
  @ApiPropertyOptional({ description: 'Texto del posteo.', maxLength: 2200 })
  @IsOptional()
  @IsString()
  @MaxLength(2200)
  caption?: string;

  @ApiPropertyOptional({ description: 'URL de la imagen a publicar.' })
  @IsOptional()
  @IsString()
  url_imagen?: string;

  @ApiPropertyOptional({ description: 'ID de la imagen en la galería.' })
  @IsOptional()
  @IsInt()
  imagen_id?: number;

  @ApiPropertyOptional({
    description: 'Estado del posteo.',
    enum: ['pendiente', 'cancelado'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['pendiente', 'cancelado'])
  estado?: string;
}
