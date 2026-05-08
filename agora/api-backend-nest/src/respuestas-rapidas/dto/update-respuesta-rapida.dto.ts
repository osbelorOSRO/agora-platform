import { IsOptional, IsString, Length, MinLength } from 'class-validator';

export class UpdateRespuestaRapidaDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  atajo?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  texto?: string;
}
