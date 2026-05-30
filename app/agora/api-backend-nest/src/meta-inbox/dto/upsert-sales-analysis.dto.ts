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
const CUSTOMER_TYPE = [
  'NO_DEFINIDO',
  'AUTONOMO',
  'ASISTIDO',
  'ABANDONO_BOT',
  'DIRECTO',
] as const;
const PURCHASE_INTENT = ['NO_DEFINIDO', 'LINEA_NUEVA', 'PORTABILIDAD'] as const;
const RESULT = ['EN_PROCESO', 'GANADO', 'PERDIDO'] as const;
const SALE_TYPE = [
  'NO_DEFINIDO',
  'PORTABILIDAD_POSTPAGO',
  'PORTABILIDAD_PREPAGO',
  'ALTA',
  'SALTA',
] as const;
const LOSS_REASON = [
  'NO_CALIFICO_SCORE',
  'NUMERO_NO_PORTABLE',
  'PRECIO_NO_CONVENCIO',
  'DECIDIO_NO_CONTRATAR',
  'NO_RESPONDIO_MAS',
  'DERIVADO_TIENDA_FISICA',
  'OTRO',
] as const;

export const SALES_ANALYSIS_ENUMS = {
  LEAD_TYPE,
  AGE_RANGE,
  SEX,
  CUSTOMER_TYPE,
  PURCHASE_INTENT,
  RESULT,
  SALE_TYPE,
  LOSS_REASON,
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
  @IsIn(CUSTOMER_TYPE)
  customerType?: string;

  @IsOptional()
  @IsIn(PURCHASE_INTENT)
  purchaseIntent?: string;

  @IsOptional()
  @IsIn(RESULT)
  result?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  planContracted?: string | null;

  @IsOptional()
  @IsIn([...SALE_TYPE, null])
  saleType?: string | null;

  @IsOptional()
  @IsIn([...LOSS_REASON, null])
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
