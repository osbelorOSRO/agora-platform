import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, Matches } from 'class-validator';

export class LoginDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  username: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  password: string;

  @ApiProperty()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Token 2FA inválido' })
  token_2fa: string;
}
