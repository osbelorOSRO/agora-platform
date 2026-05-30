import { IsOptional, IsString } from 'class-validator';

export class UpdateMetaConfigDto {
  @IsOptional() @IsString() app_id?: string;
  @IsOptional() @IsString() app_secret?: string;
  @IsOptional() @IsString() display_name?: string;
  @IsOptional() @IsString() namespace?: string;
  @IsOptional() @IsString() app_domains?: string;
  @IsOptional() @IsString() contact_email?: string;
  @IsOptional() @IsString() privacy_policy_url?: string;
  @IsOptional() @IsString() terms_of_service_url?: string;
  @IsOptional() @IsString() meta_verify_token?: string;
  @IsOptional() @IsString() meta_page_access_token?: string;
  @IsOptional() @IsString() meta_ig_verify_token?: string;
  @IsOptional() @IsString() meta_ig_access_token?: string;
  @IsOptional() @IsString() admin_access_token?: string;
  @IsOptional() @IsString() fanpage_id?: string;
}
