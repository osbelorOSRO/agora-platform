import { IsBoolean } from 'class-validator';

export class SesionEstadoDto {
  @IsBoolean()
  activo!: boolean;
}
