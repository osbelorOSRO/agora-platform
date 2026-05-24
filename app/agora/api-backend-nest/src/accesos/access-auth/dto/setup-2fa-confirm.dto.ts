import { IsString, MaxLength, Matches } from 'class-validator';

export class Setup2FAConfirmDto {
  @IsString()
  @MaxLength(100)
  username: string;

  @IsString()
  @MaxLength(20)
  bypassToken: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Código TOTP inválido' })
  totpCode: string;
}
