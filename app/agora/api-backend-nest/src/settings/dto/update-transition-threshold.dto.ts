import { IsNumber } from 'class-validator';

export class UpdateTransitionThresholdDto {
  @IsNumber({ allowInfinity: false, allowNaN: false })
  score_threshold: number;
}
