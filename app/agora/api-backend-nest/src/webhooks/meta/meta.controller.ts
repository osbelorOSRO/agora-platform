import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  Body,
  Logger,
  Headers,
  Req,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { RawBodyRequest } from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { MetaService } from './meta.service';
import { getRuntimeSecret } from '../../shared/runtime-secrets';
import { VerifyMetaWebhookQueryDto } from './dto/verify-meta-webhook-query.dto';
import { MetaWebhookPayload } from './dto/meta-webhook-payload.interface';

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
  async receive(
    @Body() body: MetaWebhookPayload,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Req() req: RawBodyRequest<Request>,
  ) {
    await this.assertMetaSignature(signature, req.rawBody);

    this.logger.debug(
      `Webhook Meta recibido: object=${body?.object} entries=${Array.isArray(body?.entry) ? body.entry.length : 0}`,
    );

    void this.metaService.handleEvent(body).catch((error) => {
      this.logger.error('Error procesando evento Meta', error?.stack || error);
    });

    return 'EVENT_RECEIVED';
  }

  private async assertMetaSignature(
    signature: string | undefined,
    rawBody?: Buffer,
  ) {
    if (!signature?.startsWith('sha256=') || !rawBody?.length) {
      throw new UnauthorizedException('Firma Meta requerida');
    }

    const appSecret = await getRuntimeSecret('META_APP_SECRET');
    const expected = createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');
    const provided = signature.slice('sha256='.length);

    const expectedBuffer = Buffer.from(expected, 'hex');
    const providedBuffer = Buffer.from(provided, 'hex');

    if (
      expectedBuffer.length !== providedBuffer.length ||
      !timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      throw new UnauthorizedException('Firma Meta inválida');
    }
  }
}
