import { IsString, IsOptional } from 'class-validator';

export class SimCardDto {
  @IsOptional()
  @IsString()
  iccid?: string;

  @IsOptional()
  @IsString()
  estado_sim: string;

  @IsOptional()
  @IsString()
  orden_movistar?: string;
}
