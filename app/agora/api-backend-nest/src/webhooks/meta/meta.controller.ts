import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  Body,
  Logger,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { MetaService } from './meta.service';
import { MetaWebhookHmacGuard } from './meta-webhook-hmac.guard';
import { getRuntimeSecret } from '../../shared/runtime-secrets';
import { VerifyMetaWebhookQueryDto } from './dto/verify-meta-webhook-query.dto';
import { MetaWebhookPayload } from './dto/meta-webhook-payload.interface';

@ApiTags('Webhooks Meta')
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
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
  async verify(
    @Query() query: VerifyMetaWebhookQueryDto,
    @Res() res: Response,
  ) {
    const verifyToken = await getRuntimeSecret('META_VERIFY_TOKEN');
    const verifyIgToken = await getRuntimeSecret('META_IG_VERIFY_TOKEN');
    const VERIFY_TOKENS = [verifyToken, verifyIgToken];

    if (
      query['hub.mode'] === 'subscribe' &&
      VERIFY_TOKENS.includes(query['hub.verify_token'])
    ) {
      this.logger.log('Meta webhook verificado');
      return res.status(200).send(query['hub.challenge']);
    }

    this.logger.warn('Meta webhook verify fallido');
    return res.sendStatus(403);
  }

  /**
   * =========================
   * 📩 Eventos entrantes
   * =========================
   */
  @Post()
  @UseGuards(MetaWebhookHmacGuard)
  async receive(@Body() body: MetaWebhookPayload) {
    this.logger.debug(
      `Webhook Meta recibido: object=${body?.object} entries=${Array.isArray(body?.entry) ? body.entry.length : 0}`,
    );

    void this.metaService.handleEvent(body).catch((error) => {
      this.logger.error('Error procesando evento Meta', error?.stack || error);
    });

    return 'EVENT_RECEIVED';
  }
}
