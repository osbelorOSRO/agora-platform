import { IsDateString, IsEnum, IsString, MaxLength } from 'class-validator';
import { offer_modality } from '@prisma/client';

export class CreateSaleDto {
  @IsDateString()
  fecha: string;

  @IsString()
  @MaxLength(12)
  run: string;

  @IsString()
  @MaxLength(200)
  full_name: string;

  @IsString()
  @MaxLength(30)
  phone: string;

  @IsString()
  @MaxLength(300)
  address: string;

  @IsString()
  @MaxLength(100)
  city: string;

  @IsString()
  @MaxLength(100)
  province: string;

  @IsString()
  @MaxLength(100)
  country: string;

  @IsString()
  @MaxLength(100)
  contract_number: string;

  @IsEnum(offer_modality)
  modality: offer_modality;

  @IsString()
  @MaxLength(20)
  offers_code: string;
}
