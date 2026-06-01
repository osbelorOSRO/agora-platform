import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendTextDto {
  @ApiProperty({
    description: 'Texto del mensaje a enviar al thread.',
    maxLength: 2000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;
}
