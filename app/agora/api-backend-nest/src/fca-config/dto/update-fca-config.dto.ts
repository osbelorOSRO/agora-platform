import { IsOptional, IsString } from 'class-validator';

export class UpdateFcaConfigDto {
  @IsOptional() @IsString() enabled?: string;
  @IsOptional() @IsString() display_name?: string;
  @IsOptional() @IsString() fb_backend_url?: string;
  @IsOptional() @IsString() fb_user_id?: string;
  @IsOptional() @IsString() fb_user_name?: string;
  @IsOptional() @IsString() app_state?: string;
}
