import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePosteoDto {
  @IsDateString()
  fecha: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  @MaxLength(2200)
  caption?: string;

  @IsOptional()
  @IsString()
  url_imagen?: string;

  @IsOptional()
  @IsInt()
  imagen_id?: number;

  @IsOptional()
  @IsString()
  @IsIn(['pendiente', 'cancelado'])
  estado?: string;

  @IsOptional()
  @IsString()
  red_social?: string;

  @IsOptional()
  @IsString()
  id_red_social?: string;
}
