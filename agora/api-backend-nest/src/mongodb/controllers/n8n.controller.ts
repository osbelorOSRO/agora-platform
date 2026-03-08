import {
  Controller,
  Post,
  Body,
  Headers,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProcesosMongoService } from '../services/procesos.mongodb.service';
import { Conversacion } from '../schemas/interfaces/conversacion.interface';
import { getRuntimeSecret } from '../../shared/runtime-secrets';

@Controller('n8n')
export class N8nController {
  constructor(
    private readonly procesosService: ProcesosMongoService,
    private readonly config: ConfigService,
  ) {}

  @Post('conversacion/:proceso_id')
  async registrarConversacion(
    @Param('proceso_id') proceso_id: string,
    @Headers('authorization') auth: string,
    @Body() conversacion: Conversacion,
  ) {
    const token =
      this.config.get<string>('N8N_SECRET_TOKEN') ||
      (await getRuntimeSecret('N8N_SECRET_TOKEN'));
    const provided = auth?.replace('Bearer ', '');

    if (!provided || provided !== token) {
      throw new UnauthorizedException('Token inválido');
    }

    return await this.procesosService.agregarConversacion(proceso_id, conversacion);
  }
}
