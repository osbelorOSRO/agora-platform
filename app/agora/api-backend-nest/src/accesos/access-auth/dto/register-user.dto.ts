import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class RegisterUserDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  username: string;

  @ApiProperty()
  @IsString()
  @MaxLength(20)
  invitationToken: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  password: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  confirmarPassword: string;
}
