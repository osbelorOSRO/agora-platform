import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListAdLeadStatsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sourceId?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? 100 : parseInt(value, 10)))
  @IsInt()
  @Min(1)
  @Max(1000)
  limit: number = 100;
}
