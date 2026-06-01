import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsString, MaxLength } from 'class-validator';
import { offer_modality } from '@prisma/client';

export class CreateSaleDto {
  @ApiProperty({
    description: 'Fecha de la venta (ISO).',
    example: '2026-01-15',
  })
  @IsDateString()
  fecha: string;

  @ApiProperty({ description: 'RUN del cliente.', maxLength: 12 })
  @IsString()
  @MaxLength(12)
  run: string;

  @ApiProperty({ description: 'Nombre completo del cliente.', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  full_name: string;

  @ApiProperty({ description: 'Teléfono del cliente.', maxLength: 30 })
  @IsString()
  @MaxLength(30)
  phone: string;

  @ApiProperty({ description: 'Dirección.', maxLength: 300 })
  @IsString()
  @MaxLength(300)
  address: string;

  @ApiProperty({ description: 'Ciudad.', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiProperty({ description: 'Provincia.', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  province: string;

  @ApiProperty({ description: 'País.', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  country: string;

  @ApiProperty({ description: 'Número de contrato.', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  contract_number: string;

  @ApiProperty({ description: 'Modalidad de la oferta.', enum: offer_modality })
  @IsEnum(offer_modality)
  modality: offer_modality;

  @ApiProperty({ description: 'Código de la oferta vendida.', maxLength: 20 })
  @IsString()
  @MaxLength(20)
  offers_code: string;
}
