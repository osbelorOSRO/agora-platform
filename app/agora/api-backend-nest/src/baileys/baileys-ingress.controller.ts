import {
  Body,
  Controller,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { BaileysIngressService } from './baileys-ingress.service';
import { BaileysIngressEnvelopeDto } from './dto/baileys-ingress-envelope.dto';
import { BaileysInternalTokenGuard } from '../shared/guards/baileys-internal-token.guard';

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
  @UseGuards(BaileysInternalTokenGuard)
  async receiveEvent(@Body() body: BaileysIngressEnvelopeDto) {
    return this.ingress.ingestEnvelope(body);
  }
}
