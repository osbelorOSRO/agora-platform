import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class N8nOfferEventCreateDto {
  @IsString()
  @MaxLength(255)
  sessionId!: string;

  @IsString()
  @MaxLength(64)
  stageActual!: string;

  @IsString()
  @IsIn(['alta', 'portabilidad'])
  tipo!: string;

  @IsString()
  @MaxLength(120)
  codigo!: string;

  @IsOptional()
  @IsString()
  @IsIn(['acepta', 'objeta', 'rechaza', 'indefinido'])
  decision?: string;
}
