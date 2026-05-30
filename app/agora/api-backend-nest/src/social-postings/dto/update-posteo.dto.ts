import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePosteoDto {
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
}
