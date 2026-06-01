import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePosteoDto {
  @ApiProperty({
    description: 'Fecha de publicación programada (YYYY-MM-DD).',
    example: '2026-01-15',
  })
  @IsDateString()
  fecha: string; // YYYY-MM-DD

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

  @ApiPropertyOptional({
    description: 'Red social destino.',
    example: 'facebook',
  })
  @IsOptional()
  @IsString()
  red_social?: string;

  @ApiPropertyOptional({
    description: 'ID de la página/cuenta en la red social.',
  })
  @IsOptional()
  @IsString()
  id_red_social?: string;
}
