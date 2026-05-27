import {
  Body,
  Controller,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FcaIngressService } from './fca-ingress.service';
import { FcaIngressEnvelopeDto } from './dto/fca-ingress-envelope.dto';
import { FcaInternalTokenGuard } from '../shared/guards/fca-internal-token.guard';

@Controller('internal/fca')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
export class FcaIngressController {
  constructor(private readonly ingress: FcaIngressService) {}

  @Post('events')
  @UseGuards(FcaInternalTokenGuard)
  async receiveEvent(@Body() body: FcaIngressEnvelopeDto) {
    return this.ingress.ingestEnvelope(body);
  }
}
