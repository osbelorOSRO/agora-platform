import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateFcaConfigDto {
  @ApiPropertyOptional({ description: 'Habilitado ("true"/"false").' })
  @IsOptional()
  @IsString()
  enabled?: string;

  @ApiPropertyOptional({ description: 'Nombre visible de la integración.' })
  @IsOptional()
  @IsString()
  display_name?: string;

  @ApiPropertyOptional({
    description: 'URL del backend de Facebook (fb-backend).',
  })
  @IsOptional()
  @IsString()
  fb_backend_url?: string;

  @ApiPropertyOptional({ description: 'ID del usuario de Facebook conectado.' })
  @IsOptional()
  @IsString()
  fb_user_id?: string;

  @ApiPropertyOptional({
    description: 'Nombre del usuario de Facebook conectado.',
  })
  @IsOptional()
  @IsString()
  fb_user_name?: string;

  @ApiPropertyOptional({ description: 'App state de la sesión FCA (secreto).' })
  @IsOptional()
  @IsString()
  app_state?: string;
}
