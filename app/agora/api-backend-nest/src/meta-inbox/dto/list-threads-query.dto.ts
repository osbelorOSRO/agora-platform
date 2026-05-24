import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListThreadsQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? 100 : parseInt(value, 10)))
  @IsInt()
  @Min(1)
  @Max(200)
  limit: number = 100;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? 0 : parseInt(value, 10)))
  @IsInt()
  @Min(0)
  offset: number = 0;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeClosed: boolean = false;
}
