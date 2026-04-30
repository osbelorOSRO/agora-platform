import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class N8nOfferEventUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  stageActual?: string;

  @IsOptional()
  @IsString()
  @IsIn(['alta', 'portabilidad'])
  tipo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  codigo?: string;

  @IsOptional()
  @IsString()
  @IsIn(['acepta', 'objeta', 'rechaza', 'indefinido'])
  decision?: string;
}
