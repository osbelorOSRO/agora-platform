import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsString, MaxLength, Min } from 'class-validator';

export class CreateRolDto {
  @ApiProperty({ description: 'Nombre del rol.', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({
    description: 'IDs de los permisos asignados al rol.',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  permisos: number[];
}
