import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateMetaConfigDto {
  @ApiPropertyOptional({ description: 'App ID de Meta.' })
  @IsOptional()
  @IsString()
  app_id?: string;

  @ApiPropertyOptional({ description: 'App Secret de Meta (secreto).' })
  @IsOptional()
  @IsString()
  app_secret?: string;

  @ApiPropertyOptional({ description: 'Nombre visible de la app.' })
  @IsOptional()
  @IsString()
  display_name?: string;

  @ApiPropertyOptional({ description: 'Namespace de la app.' })
  @IsOptional()
  @IsString()
  namespace?: string;

  @ApiPropertyOptional({ description: 'Dominios de la app.' })
  @IsOptional()
  @IsString()
  app_domains?: string;

  @ApiPropertyOptional({ description: 'Email de contacto.' })
  @IsOptional()
  @IsString()
  contact_email?: string;

  @ApiPropertyOptional({ description: 'URL de política de privacidad.' })
  @IsOptional()
  @IsString()
  privacy_policy_url?: string;

  @ApiPropertyOptional({ description: 'URL de términos de servicio.' })
  @IsOptional()
  @IsString()
  terms_of_service_url?: string;

  @ApiPropertyOptional({
    description: 'Verify token del webhook de Meta (secreto).',
  })
  @IsOptional()
  @IsString()
  meta_verify_token?: string;

  @ApiPropertyOptional({ description: 'Page access token de Meta (secreto).' })
  @IsOptional()
  @IsString()
  meta_page_access_token?: string;

  @ApiPropertyOptional({ description: 'Verify token de Instagram (secreto).' })
  @IsOptional()
  @IsString()
  meta_ig_verify_token?: string;

  @ApiPropertyOptional({ description: 'Access token de Instagram (secreto).' })
  @IsOptional()
  @IsString()
  meta_ig_access_token?: string;

  @ApiPropertyOptional({ description: 'Admin access token (secreto).' })
  @IsOptional()
  @IsString()
  admin_access_token?: string;

  @ApiPropertyOptional({ description: 'ID de la fanpage.' })
  @IsOptional()
  @IsString()
  fanpage_id?: string;
}
