import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min, Matches } from 'class-validator';

export class PreregistrarUsuarioDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'username solo puede contener letras, números, guiones y puntos',
  })
  username: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  rolId: number;
}
