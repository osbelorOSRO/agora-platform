import { IsString, MaxLength } from 'class-validator';

export class RegisterUserDto {
  @IsString()
  @MaxLength(100)
  username: string;

  @IsString()
  @MaxLength(20)
  invitationToken: string;

  @IsString()
  @MaxLength(200)
  password: string;

  @IsString()
  @MaxLength(200)
  confirmarPassword: string;
}
