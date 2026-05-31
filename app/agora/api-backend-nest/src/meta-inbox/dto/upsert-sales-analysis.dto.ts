import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const LEAD_TYPE = ['DESCONOCIDO', 'LEAD', 'ORGANICO'] as const;
const AGE_RANGE = [
  'NO_DEFINIDO',
  'RANGO_18_24',
  'RANGO_25_34',
  'RANGO_35_44',
  'RANGO_45_54',
  'RANGO_55_64',
  'RANGO_65_PLUS',
] as const;
const SEX = ['NO_IDENTIFICADO', 'MASCULINO', 'FEMENINO'] as const;
const RESULT = ['EN_PROCESO', 'GANADO', 'PERDIDO'] as const;

export const SALES_ANALYSIS_ENUMS = {
  LEAD_TYPE,
  AGE_RANGE,
  SEX,
  RESULT,
};

export class UpsertSalesAnalysisDto {
  @IsOptional()
  @IsIn(LEAD_TYPE)
  leadType?: string;

  @IsOptional()
  @IsIn(AGE_RANGE)
  ageRange?: string;

  @IsOptional()
  @IsIn(SEX)
  sex?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  customerType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  purchaseIntent?: string;

  @IsOptional()
  @IsIn(RESULT)
  result?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  planContracted?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  saleType?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  lossReason?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  verbalizationTags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  verbalizationText?: string | null;
}
