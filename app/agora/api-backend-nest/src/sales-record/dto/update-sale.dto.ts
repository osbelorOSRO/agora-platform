import { IsOptional, IsString, MaxLength } from 'class-validator';

// Solo campos no-calculados. Para cambiar código/modalidad/fecha: eliminar y recrear.
export class UpdateSaleDto {
  @IsOptional()
  @IsString()
  @MaxLength(12)
  run?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  full_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contract_number?: string;
}
