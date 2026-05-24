import { IsString, MaxLength, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @MaxLength(100)
  username: string;

  @IsString()
  @MaxLength(200)
  password: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Token 2FA inválido' })
  token_2fa: string;
}
