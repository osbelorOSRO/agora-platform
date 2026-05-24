import { IsString, MaxLength } from 'class-validator';

export class Setup2FAInitDto {
  @IsString()
  @MaxLength(100)
  username: string;

  @IsString()
  @MaxLength(200)
  password: string;

  @IsString()
  @MaxLength(20)
  bypassToken: string;
}
