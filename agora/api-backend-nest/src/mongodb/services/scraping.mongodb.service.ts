import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Proceso } from '../schemas/proceso.schema';

@Injectable()
export class ScrapingMongoService {
  private readonly logger = new Logger(ScrapingMongoService.name);

  constructor(
    @InjectModel('Proceso') private readonly procesoModel: Model<Proceso>,
  ) {}

  // 🟢 POST /scraping/tarea → registrar una nueva tarea
  async crearTarea(
    proceso_id: string,
    payload: Record<string, any>,
  ): Promise<{ proceso_id: string; subproceso_index: number | null; persistido: boolean }> {
    const payloadNormalizado = {
      ...payload,
      rut: payload.rut ? String(payload.rut) : undefined,
      numero: payload.numero ? String(payload.numero) : undefined,
    };

    const nuevaTarea = {
      tipo: 'scraping',
      estado: 'pendiente',
      payload: payloadNormalizado,
      fecha_inicio: new Date(),
    };

    const updated = await this.procesoModel.updateOne(
      { proceso_id },
      { $push: { subprocesos: nuevaTarea } },
    );

    if (updated.modifiedCount === 0) {
      this.logger.warn(
        `SCRAPING[MONGO] create skipped proceso_id=${proceso_id} reason=proceso_no_encontrado`,
      );
      return { proceso_id, subproceso_index: null, persistido: false };
    }

    // obtener posición de la nueva tarea
    const procesoActualizado = await this.procesoModel.findOne({ proceso_id });
    if (!procesoActualizado) {
      this.logger.warn(
        `SCRAPING[MONGO] create post-check skipped proceso_id=${proceso_id} reason=proceso_no_encontrado_post_update`,
      );
      return { proceso_id, subproceso_index: null, persistido: false };
    }

    const subproceso_index = procesoActualizado.subprocesos.length - 1;

    return { proceso_id, subproceso_index, persistido: true };
  }

  // 🔵 POST /scraping/respuesta → guardar resultado del scraping
  async guardarResultado(
    proceso_id: string,
    resultado: {
      respuesta: 'factible' | 'no_factible' | 'error';
      mensaje?: string;
      payload?: Record<string, any>;
    },
  ): Promise<{ persistido: boolean }> {
    // 🛠 Normalizar si payload viene con una capa extra "resultado"
    let resultadoNormalizado = resultado;
    if (resultado.payload && (resultado.payload as any).resultado) {
      resultadoNormalizado = {
        ...resultado,
        payload: (resultado.payload as any).resultado,
      };
    }

    const updated = await this.procesoModel.updateOne(
      {
        proceso_id,
        'subprocesos': {
          $elemMatch: { tipo: 'scraping', estado: 'pendiente' },
        },
      },
      {
        $set: {
          'subprocesos.$[elem].estado': 'completado',
          'subprocesos.$[elem].resultado': resultadoNormalizado,
          'subprocesos.$[elem].fecha_fin': new Date(),
        },
      },
      {
        arrayFilters: [
          { 'elem.tipo': 'scraping', 'elem.estado': 'pendiente' },
        ],
      },
    );

    if (updated.modifiedCount === 0) {
      this.logger.warn(
        `SCRAPING[MONGO] result skipped proceso_id=${proceso_id} reason=subproceso_no_encontrado_o_ya_completado`,
      );
      return { persistido: false };
    }

    return { persistido: true };
  }
}
