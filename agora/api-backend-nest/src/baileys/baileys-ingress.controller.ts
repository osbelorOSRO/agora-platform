import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Post,
} from '@nestjs/common';
import { BaileysIngressService } from './baileys-ingress.service';

@Controller('internal/baileys')
export class BaileysIngressController {
  constructor(private readonly ingress: BaileysIngressService) {}

  @Post('events')
  async receiveEvent(
    @Body() body: any,
    @Headers('x-internal-token') internalToken?: string,
  ) {
    this.assertInternalToken(internalToken);
    return this.ingress.ingestEnvelope(body);
  }

  private assertInternalToken(internalToken?: string) {
    const expected = process.env.BAILEYS_INTERNAL_TOKEN;
    if (!expected?.trim()) return;

    if (!internalToken || internalToken !== expected) {
      throw new ForbiddenException('Token interno inválido');
    }
  }
}
