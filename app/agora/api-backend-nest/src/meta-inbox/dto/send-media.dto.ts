import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SendMediaDto {
  @ApiPropertyOptional({
    description: 'Caption opcional para el archivo multimedia.',
    maxLength: 4000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  caption?: string;
}
