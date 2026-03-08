import { IsString, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { SimCardDto } from './sim-card.dto';

export class AbonadoDto {
  @IsOptional()
  @IsString()
  id_abonado?: string;
  
  @IsOptional()
  @IsString()
  numero: string;

  @IsOptional()
  @IsString()
  cap?: string;

  @IsOptional()
  @IsString()
  compania_donante?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SimCardDto)
  sim_cards: SimCardDto[];
}
