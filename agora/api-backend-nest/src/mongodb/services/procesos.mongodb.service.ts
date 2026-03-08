import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Proceso } from '../schemas/proceso.schema';
import { Conversacion } from '../schemas/interfaces/conversacion.interface';

@Injectable()
export class ProcesosMongoService {
  constructor(
    @InjectModel('Proceso') private readonly procesoModel: Model<Proceso>,
  ) {}

  // Crear un nuevo proceso completo
  async crearProceso(data: Partial<Proceso>) {
    const nuevo = new this.procesoModel(data);
    return await nuevo.save();
  }

  // Obtener todos los procesos de un cliente
  async obtenerPorCliente(cliente_id: string) {
    return await this.procesoModel.find({ cliente_id }).exec();
  }

  // Obtener un proceso por su proceso_id
  async obtenerPorProcesoId(proceso_id: string) {
    return await this.procesoModel.findOne({ proceso_id }).exec();
  }

  // Actualizar un proceso por proceso_id (parcial o completo)
  async actualizarProceso(proceso_id: string, data: Partial<Proceso>) {
    const existe = await this.procesoModel.findOne({ proceso_id }).exec();
    if (!existe) throw new NotFoundException('Proceso no encontrado');

    return await this.procesoModel.findOneAndUpdate(
      { proceso_id },
      { $set: data },
      { new: true },
    ).exec();
  }

  // Agregar una nueva conversación al proceso
  async agregarConversacion(proceso_id: string, conversacion: Conversacion) {
    const existe = await this.procesoModel.findOne({ proceso_id }).exec();
    if (!existe) throw new NotFoundException('Proceso no encontrado');

    return await this.procesoModel.findOneAndUpdate(
      { proceso_id },
      { $push: { conversaciones: conversacion } },
      { new: true },
    ).exec();
  }

  // Agregar un nuevo subproceso
  async agregarSubproceso(proceso_id: string, subproceso: Proceso['subprocesos'][0]) {
    const existe = await this.procesoModel.findOne({ proceso_id }).exec();
    if (!existe) throw new NotFoundException('Proceso no encontrado');

    return await this.procesoModel.findOneAndUpdate(
      { proceso_id },
      { $push: { subprocesos: subproceso } },
      { new: true },
    ).exec();
  }

  // Agregar un nuevo contrato
  async agregarContrato(proceso_id: string, contrato: Proceso['contratos'][0]) {
    const existe = await this.procesoModel.findOne({ proceso_id }).exec();
    if (!existe) throw new NotFoundException('Proceso no encontrado');

    return await this.procesoModel.findOneAndUpdate(
      { proceso_id },
      { $push: { contratos: contrato } },
      { new: true },
    ).exec();
  }
// listar converesaciones de un cliente
async obtenerConversacionesOrdenadas(proceso_id: string) {
  const proceso = await this.obtenerPorProcesoId(proceso_id);
  if (!proceso) throw new NotFoundException('Proceso no encontrado');

  return (proceso.conversaciones || []).sort(
    (a, b) => new Date(a.fecha_envio).getTime() - new Date(b.fecha_envio).getTime()
  );
}
//listar activos para clientes services

async tieneMensajesRecientes(cliente_id: string, dias = 7): Promise<boolean> {
  const procesos = await this.obtenerPorCliente(cliente_id);
  if (!procesos || procesos.length === 0) return false;

  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - dias);

  for (const proceso of procesos) {
    for (const conversacion of proceso.conversaciones || []) {
      if (conversacion.direccion === "input") {
        const fecha = new Date(conversacion.fecha_envio);
        if (fecha > fechaLimite) {
          return true;
        }
      }
    }
  }

  return false;
}
async cerrarProceso(data: {
  proceso_id: string;
  tipo: string;
  tipo_cierre: string;
  cerrado_por: string;
  fecha_fin: Date;
}) {
  return this.procesoModel.updateOne(
    { proceso_id: data.proceso_id },
    {
      $set: {
        estado: 'cerrado',
        tipo: data.tipo,
        tipo_cierre: data.tipo_cierre,
        cerrado_por: data.cerrado_por,
        fecha_fin: data.fecha_fin,
      },
    },
  );
}

// al final de la clase ProcesosMongoService
async clientesConMensajesRecientes(clienteIds: string[], dias = 7): Promise<Set<string>> {
  if (!clienteIds?.length) return new Set();

  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - dias);

  const rows = await this.procesoModel.aggregate<{ _id: string }>([
    { $match: { cliente_id: { $in: clienteIds } } },
    {
      $project: {
        cliente_id: 1,
        convs: {
          $filter: {
            input: '$conversaciones',
            as: 'c',
            cond: {
              $and: [
                { $eq: ['$$c.direccion', 'input'] },
                { $gte: ['$$c.fecha_envio', fechaLimite] },
              ],
            },
          },
        },
      },
    },
    { $match: { convs: { $exists: true, $ne: [], $not: { $size: 0 } } } },
    { $group: { _id: '$cliente_id' } },
  ]).exec();

  return new Set(rows.map(r => r._id));
}
// al final de ProcesosMongoService

// al final de ProcesosMongoService

// al final de ProcesosMongoService

// Obtener la última conversación de un proceso específico, filtrando solo outputs
async obtenerUltimaConversacionBot(cliente_id: string, proceso_id: number) {
  const proceso = await this.procesoModel
    .findOne({ cliente_id, proceso_id }) // 👈 ahora busca por el campo proceso_id numérico
    .lean()
    .exec();

  if (!proceso || !proceso.conversaciones || proceso.conversaciones.length === 0) {
    return null;
  }

  // filtrar solo mensajes del bot (output)
  const outputs = proceso.conversaciones.filter(c => c.direccion === "output");
  if (outputs.length === 0) return null;

  // ordenar por fecha_envio y tomar el último
  const ultima = outputs.sort(
    (a, b) => new Date(b.fecha_envio).getTime() - new Date(a.fecha_envio).getTime()
  )[0];

  return ultima;
}
}
