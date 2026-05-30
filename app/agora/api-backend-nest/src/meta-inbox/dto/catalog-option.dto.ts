import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const CATALOG_CATEGORIES = [
  'customer_type',
  'purchase_intent',
  'sale_type',
  'loss_reason',
  'verbalization_tag',
] as const;

export class CreateCatalogOptionDto {
  @IsIn(CATALOG_CATEGORIES)
  category: string;

  @IsString()
  @MaxLength(128)
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'value solo puede contener letras minúsculas, números y guiones bajos',
  })
  value: string;

  @IsString()
  @MaxLength(255)
  label: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateCatalogOptionDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
