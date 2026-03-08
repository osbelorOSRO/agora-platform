import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ModoPilotoDto {
  @IsNotEmpty()
  @IsString()
  cliente_id: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['audio', 'no_audio'])
  msg_mode: string;
}
