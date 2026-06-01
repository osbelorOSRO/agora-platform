import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// Solo campos no-calculados. Para cambiar código/modalidad/fecha: eliminar y recrear.
export class UpdateSaleDto {
  @ApiPropertyOptional({ description: 'RUN del cliente.', maxLength: 12 })
  @IsOptional()
  @IsString()
  @MaxLength(12)
  run?: string;

  @ApiPropertyOptional({
    description: 'Nombre completo del cliente.',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  full_name?: string;

  @ApiPropertyOptional({ description: 'Teléfono del cliente.', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ description: 'Dirección.', maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ description: 'Ciudad.', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Provincia.', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @ApiPropertyOptional({ description: 'País.', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ description: 'Número de contrato.', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contract_number?: string;
}
