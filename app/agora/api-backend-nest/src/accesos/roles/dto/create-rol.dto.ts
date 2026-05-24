import { IsArray, IsInt, IsString, MaxLength, Min } from 'class-validator';

export class CreateRolDto {
  @IsString()
  @MaxLength(100)
  nombre: string;

  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  permisos: number[];
}
