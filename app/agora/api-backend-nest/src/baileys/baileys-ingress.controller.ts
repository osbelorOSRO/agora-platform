import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { BaileysIngressService } from './baileys-ingress.service';
import { BaileysIngressEnvelopeDto } from './dto/baileys-ingress-envelope.dto';

@Controller('internal/baileys')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
export class BaileysIngressController {
  constructor(private readonly ingress: BaileysIngressService) {}

  @Post('events')
  async receiveEvent(
    @Body() body: BaileysIngressEnvelopeDto,
    @Headers('x-internal-token') internalToken?: string,
  ) {
    this.assertInternalToken(internalToken);
    return this.ingress.ingestEnvelope(body);
  }

  private assertInternalToken(internalToken?: string) {
    const expected = process.env.BAILEYS_INTERNAL_TOKEN;
    if (!expected?.trim()) {
      throw new ForbiddenException('Token interno no configurado');
    }

    if (!internalToken || internalToken !== expected) {
      throw new ForbiddenException('Token interno inválido');
    }
  }
}
