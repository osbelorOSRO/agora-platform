import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class N8nOfferContextDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  sessionId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  stageActual?: string;

  @IsOptional()
  @IsString()
  @IsIn(['alta', 'portabilidad', 'portabilidad_postpago'])
  modo?: string;

  @IsOptional()
  @IsString()
  @IsIn(['acepta', 'objeta', 'rechaza', 'indefinido'])
  decision?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  currentOfferId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  currentCodigo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  lineas?: number;
}
