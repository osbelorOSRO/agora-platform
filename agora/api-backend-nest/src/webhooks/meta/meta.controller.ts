import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  Body,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { MetaService } from './meta.service';
import { getRuntimeSecret } from '../../shared/runtime-secrets';

@Controller('webhooks/meta')
export class MetaController {
  private readonly logger = new Logger(MetaController.name);

  constructor(private readonly metaService: MetaService) {}

  /**
   * =========================
   * 🔐 Verificación Webhook
   * =========================
  */
  @Get()
  async verify(@Query() query: any, @Res() res: Response) {
    const verifyToken = await getRuntimeSecret('META_VERIFY_TOKEN');
    const verifyIgToken = await getRuntimeSecret('META_IG_VERIFY_TOKEN');
    const VERIFY_TOKENS = [
      verifyToken,
      verifyIgToken,
    ];

    if (
      query['hub.mode'] === 'subscribe' &&
      VERIFY_TOKENS.includes(query['hub.verify_token'])
    ) {
      console.log('✅ META WEBHOOK VERIFIED');
      return res.status(200).send(query['hub.challenge']);
    }

    console.log('❌ META WEBHOOK VERIFY FAILED');
    return res.sendStatus(403);
  }

  /**
   * =========================
   * 📩 Eventos entrantes
   * =========================
   */
  @Post()
  receive(@Body() body: any) {

    console.log('📩 POST webhook recibido desde Meta');
    console.log('Objeto:', body.object);

    console.log(
      'RAW EVENT:',
      JSON.stringify(body, null, 2),
    );

    void this.metaService.handleEvent(body).catch((error) => {
      this.logger.error('Error procesando evento Meta', error?.stack || error);
    });

    return 'EVENT_RECEIVED';
  }
}
