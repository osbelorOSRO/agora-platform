import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FcaInternalTokenGuard } from '../shared/guards/fca-internal-token.guard';
import { FcaConfigService } from '../fca-config/fca-config.service';

@Controller('internal/fca')
@UseGuards(FcaInternalTokenGuard)
export class FcaConfigInternalController {
  constructor(private readonly fcaConfig: FcaConfigService) {}

  @Get('config')
  async getConfig() {
    const app_state = await this.fcaConfig.getSecret('app_state');
    const row = await this.fcaConfig.get();
    return {
      app_state,
      enabled: row.enabled ?? 'false',
      fb_backend_url: row.fb_backend_url ?? null,
    };
  }

  @Post('status')
  @HttpCode(200)
  async updateStatus(
    @Body() body: { fb_user_id?: string; fb_user_name?: string },
  ) {
    await this.fcaConfig.updateStatusFields({
      fb_user_id: body.fb_user_id,
      fb_user_name: body.fb_user_name,
    });
    return { ok: true };
  }
}
