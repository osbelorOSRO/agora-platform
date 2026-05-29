import { ApiTags } from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FcaInternalTokenGuard } from '../shared/guards/fca-internal-token.guard';
import { FcaConfigService } from '../fca-config/fca-config.service';
import {
  IWebsocketNotifierGateway,
  WEBSOCKET_NOTIFIER_GATEWAY,
} from '../websocket-notifier/interfaces/websocket-notifier-gateway.interface';

@ApiTags('Interno')
@Controller('internal/fca')
@UseGuards(FcaInternalTokenGuard)
export class FcaConfigInternalController {
  constructor(
    private readonly fcaConfig: FcaConfigService,
    @Inject(WEBSOCKET_NOTIFIER_GATEWAY)
    private readonly wsNotifier: IWebsocketNotifierGateway,
  ) {}

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
    @Body()
    body: {
      fb_user_id?: string;
      fb_user_name?: string;
      mqtt_connected?: boolean;
      mqtt_event?: 'connected' | 'disconnected' | 'cycling';
    },
  ) {
    await this.fcaConfig.updateStatusFields({
      fb_user_id: body.fb_user_id,
      fb_user_name: body.fb_user_name,
    });

    if (body.mqtt_event) {
      this.fcaConfig.setMqttStatus({
        mqtt_connected: body.mqtt_connected ?? false,
        event: body.mqtt_event,
        fb_user_id: body.fb_user_id,
        fb_user_name: body.fb_user_name,
      });
      await this.wsNotifier.notificarFcaMqttStatus({
        mqtt_connected: body.mqtt_connected ?? false,
        event: body.mqtt_event,
        fb_user_id: body.fb_user_id,
        fb_user_name: body.fb_user_name,
      });
    }

    return { ok: true };
  }
}
