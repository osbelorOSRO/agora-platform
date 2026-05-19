import { PartialType } from '@nestjs/mapped-types';
import { CreateOfferDto } from './create-offer.dto';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateOfferDto extends PartialType(CreateOfferDto) {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  codigo?: string;
}
