import { IsString, Length } from 'class-validator';

export class CreateRespuestaRapidaDto {
  @IsString()
  @Length(1, 50)
  atajo: string;

  @IsString()
  texto: string;
}
