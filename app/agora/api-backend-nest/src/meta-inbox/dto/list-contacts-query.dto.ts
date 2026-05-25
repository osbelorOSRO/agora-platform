import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListContactsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  objectType?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? 50 : parseInt(value, 10)))
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 50;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? 0 : parseInt(value, 10)))
  @IsInt()
  @Min(0)
  offset: number = 0;
}
