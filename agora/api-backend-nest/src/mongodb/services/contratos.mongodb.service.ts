import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cliente } from '../schemas/cliente.schema';
import { CrearContratoDto } from '../dto/crear-contrato.dto';
import { ActualizarContratoDto } from '../dto/actualizar-contrato.dto';

@Injectable()
export class ContratosMongoService {
  constructor(
    @InjectModel('Cliente') private clienteModel: Model<Cliente>,
  ) {}

  async getContratosByClienteId(clienteId: string) {
    const cliente = await this.clienteModel.findOne({ cliente_id: clienteId }).exec();
    if (!cliente) throw new NotFoundException(`Cliente ${clienteId} no encontrado`);

    return (cliente.contrato || []).map(c => ({
      contrato_id: c.contrato_id,
      fecha: c.fecha,
    }));
  }

  async getContrato(clienteId: string, contratoId: string) {
    const cliente = await this.clienteModel.findOne({ cliente_id: clienteId }).exec();
    if (!cliente) throw new NotFoundException(`Cliente ${clienteId} no encontrado`);
    const contrato = cliente.contrato.find(c => c.contrato_id === contratoId);
    if (!contrato) throw new NotFoundException(`Contrato ${contratoId} no encontrado`);
    return contrato;
  }

  async crearContrato(clienteId: string, crearContratoDto: CrearContratoDto) {
    const cliente = await this.clienteModel.findOne({ cliente_id: clienteId }).exec();
    if (!cliente) throw new NotFoundException(`Cliente ${clienteId} no encontrado`);

    const ahora = new Date();

    const nuevoContrato = {
      contrato_id: new Types.ObjectId().toHexString(),
      creado_en: ahora,
      actualizado_en: ahora,
      ...crearContratoDto,
    };

    cliente.contrato.push(nuevoContrato);
    await cliente.save();

    return nuevoContrato;
  }

  async actualizarContrato(clienteId: string, contratoId: string, actualizarContratoDto: ActualizarContratoDto) {
    const cliente = await this.clienteModel.findOne({ cliente_id: clienteId }).exec();
    if (!cliente) throw new NotFoundException(`Cliente ${clienteId} no encontrado`);

    const index = cliente.contrato.findIndex(c => c.contrato_id === contratoId);
    if (index === -1) throw new NotFoundException(`Contrato ${contratoId} no encontrado`);

    // Función para hacer merge profundo
    const mergeDeep = (target: any, source: any) => {
      for (const key in source) {
        if (
          source[key] &&
          typeof source[key] === 'object' &&
          !Array.isArray(source[key])
        ) {
          if (!target[key]) {
            target[key] = {};
          }
          mergeDeep(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    };

    // Hace merge en el contrato existente
    mergeDeep(cliente.contrato[index], actualizarContratoDto);
    cliente.contrato[index].actualizado_en = new Date();

    await cliente.save();

    return cliente.contrato[index];
  }
}
