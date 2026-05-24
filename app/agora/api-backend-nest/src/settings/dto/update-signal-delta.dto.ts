import { IsNumber } from 'class-validator';

export class UpdateSignalDeltaDto {
  @IsNumber({ allowInfinity: false, allowNaN: false })
  delta: number;
}
