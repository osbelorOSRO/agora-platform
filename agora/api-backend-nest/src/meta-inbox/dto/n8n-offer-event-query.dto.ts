import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class N8nOfferEventQueryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  sessionId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  codigo?: string;

  @IsOptional()
  @IsString()
  @IsIn(['acepta', 'objeta', 'rechaza', 'indefinido'])
  decision?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  stageActual?: string;

  @IsOptional()
  @IsString()
  @IsIn(['alta', 'portabilidad'])
  tipo?: string;
}
