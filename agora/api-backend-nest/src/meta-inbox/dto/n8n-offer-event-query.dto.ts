import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class N8nOfferEventQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  codigo?: string;

  @IsOptional()
  @IsString()
  @IsIn(['acepta', 'objeta', 'rechaza', 'indefinido'])
  decision?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  stageActual?: string;

  @IsOptional()
  @IsString()
  @IsIn(['alta', 'portabilidad'])
  tipo?: string;
}
