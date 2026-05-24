import { IsString, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MaxLength(100)
  username: string;

  @IsString()
  @MaxLength(20)
  resetToken: string;

  @IsString()
  @MaxLength(200)
  newPassword: string;

  @IsString()
  @MaxLength(200)
  confirmarPassword: string;
}
