import { Controller, Post, Get, Param, Body, HttpCode, Query, NotFoundException } from '@nestjs/common';
import { ScrapingMongoService } from '../services/scraping.mongodb.service';
import { Proceso } from '../schemas/proceso.schema';

@Controller('scraping')
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingMongoService) {}

// 🟢 POST /scraping/tarea → llamado por n8n
@Post('tarea')
async crearTarea(@Body() body: { proceso_id: string; payload: Record<string, any> }) {
  const { proceso_id, payload } = body;
  const resultado = await this.scrapingService.crearTarea(proceso_id, payload);

  return {
    ok: true,
    mensaje: 'Tarea registrada',
    proceso_id: resultado.proceso_id,
    subproceso_index: resultado.subproceso_index
  };
}

  // 🔵 POST /scraping/respuesta → llamado por poller con resultado
  @Post('respuesta')
  @HttpCode(200)
  async guardarRespuesta(@Body() body: {
    proceso_id: string;
    resultado: {
      respuesta: 'factible' | 'no_factible' | 'error';
      mensaje?: string;
      payload?: Record<string, any>;
    };
  }) {
    const { proceso_id, resultado } = body;
    await this.scrapingService.guardarResultado(proceso_id, resultado);
    return { ok: true, mensaje: 'Resultado guardado' };
  }


}




