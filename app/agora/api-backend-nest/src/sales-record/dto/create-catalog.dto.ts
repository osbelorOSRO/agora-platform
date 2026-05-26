import { IsEnum, IsIn, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import { offer_modality } from '@prisma/client';

export class CreateCatalogDto {
  @IsString()
  @MaxLength(20)
  code: string;

  @IsEnum(offer_modality)
  modality: offer_modality;

  @IsInt()
  @Min(1)
  @Max(9)
  level: number;

  @IsIn([0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0])
  points: number;
}
