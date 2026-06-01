import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateOfferDto } from './create-offer.dto';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// PartialType de @nestjs/swagger: hereda los @ApiProperty/validadores de
// CreateOfferDto y los vuelve opcionales (documentación completa en Swagger).
export class UpdateOfferDto extends PartialType(CreateOfferDto) {
  @ApiPropertyOptional({
    description: 'Código único de la oferta.',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  codigo?: string;
}
