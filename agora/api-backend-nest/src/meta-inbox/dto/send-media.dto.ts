import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SendMediaDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  caption?: string;
}
