import { IsIn, IsString, MaxLength, ValidateIf } from 'class-validator';

export class N8nSendTextDto {
  @ValidateIf((o) => !o.actorExternalId)
  @IsString()
  @MaxLength(255)
  sessionId?: string;

  @ValidateIf((o) => !o.sessionId)
  @IsString()
  @MaxLength(255)
  actorExternalId?: string;

  @ValidateIf((o) => !o.sessionId)
  @IsString()
  @IsIn(['PAGE', 'INSTAGRAM'])
  objectType?: string;

  @IsString()
  @MaxLength(4000)
  text!: string;
}
