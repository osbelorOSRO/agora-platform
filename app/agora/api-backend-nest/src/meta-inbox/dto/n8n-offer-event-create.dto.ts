import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class N8nOfferEventCreateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  sessionId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  stageActual!: string;

  @IsString()
  @MinLength(1)
  @IsIn(['alta', 'portabilidad'])
  tipo!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  codigo!: string;

  @IsOptional()
  @IsString()
  @IsIn(['acepta', 'objeta', 'rechaza', 'indefinido'])
  decision?: string;
}
