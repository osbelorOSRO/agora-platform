import { IsString, Length, MinLength } from 'class-validator';

export class CreateShortcutDto {
  @IsString()
  @Length(1, 50)
  atajo: string;

  @IsString()
  @MinLength(1)
  texto: string;
}
