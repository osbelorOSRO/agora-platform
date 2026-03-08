import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cliente } from '../schemas/cliente.schema';
import { ClienteMongo, Contrato } from '../../types/ClienteMongo';

interface CampoDinamicoDTO {
  cliente_id: string;
  campo: keyof ClienteMongo;
  valor: any;
}

@Injectable()
export class ClientesMongoService {
  constructor(
    @InjectModel('Cliente') private readonly clienteModel: Model<Cliente>,
  ) {}

  // ✅ Obtener cliente por ID
  async obtenerCliente(cliente_id: string) {
    return await this.clienteModel.findOne({ cliente_id }).exec();
  }

  // ✅ Actualizar datos completos del cliente (parcial)
  async actualizarCliente(cliente_id: string, datos: Partial<ClienteMongo>) {
    return await this.clienteModel.findOneAndUpdate(
      { cliente_id },
      { $set: datos },
      { new: true }
    ).exec();
  }

  // ✅ Actualizar campo específico del cliente
  async actualizarCampo(dto: CampoDinamicoDTO) {
    return await this.clienteModel.findOneAndUpdate(
      { cliente_id: dto.cliente_id },
      { $set: { [dto.campo]: dto.valor } },
      { new: true }
    ).exec();
  }

  // ✅ Agregar contrato
  async agregarContrato(cliente_id: string, contrato: Contrato) {
    return await this.clienteModel.findOneAndUpdate(
      { cliente_id },
      { $push: { contrato } },
      { new: true }
    ).exec();
  }

  async existe(cliente_id: string): Promise<boolean> {
    const cliente = await this.clienteModel.findOne({ cliente_id }).lean();
    return !!cliente;
  }

  async crearCliente(data: Partial<ClienteMongo>): Promise<ClienteMongo> {
    return await this.clienteModel.create(data);
  }

async eliminarCliente(cliente_id: string): Promise<void> {
  await this.clienteModel.deleteOne({ cliente_id });
}
}
