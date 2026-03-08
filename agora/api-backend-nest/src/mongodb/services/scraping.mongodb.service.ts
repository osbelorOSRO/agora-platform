import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Proceso } from '../schemas/proceso.schema';

@Injectable()
export class ScrapingMongoService {
  constructor(
    @InjectModel('Proceso') private readonly procesoModel: Model<Proceso>,
  ) {}

  // 🟢 POST /scraping/tarea → registrar una nueva tarea
  async crearTarea(
    proceso_id: string,
    payload: Record<string, any>,
  ): Promise<{ proceso_id: string; subproceso_index: number }> {
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
      throw new NotFoundException('Proceso no encontrado o no modificado');
    }

    // obtener posición de la nueva tarea
    const procesoActualizado = await this.procesoModel.findOne({ proceso_id });
    if (!procesoActualizado) {
      throw new NotFoundException('Proceso no encontrado tras crear tarea');
    }

    const subproceso_index = procesoActualizado.subprocesos.length - 1;

    return { proceso_id, subproceso_index };
  }

  // 🔵 POST /scraping/respuesta → guardar resultado del scraping
  async guardarResultado(
    proceso_id: string,
    resultado: {
      respuesta: 'factible' | 'no_factible' | 'error';
      mensaje?: string;
      payload?: Record<string, any>;
    },
  ): Promise<void> {
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
      throw new NotFoundException(
        'Subproceso scraping no encontrado o ya completado',
      );
    }
  }
}

