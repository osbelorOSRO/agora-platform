import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateRespuestaRapidaDto {
  @IsOptional()
  @IsString()
  @Length(1, 50)
  atajo?: string;

  @IsOptional()
  @IsString()
  texto?: string;
}
