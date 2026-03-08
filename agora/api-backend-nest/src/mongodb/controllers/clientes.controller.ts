// src/mongodb/controllers/clientes.controller.ts

import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
} from '@nestjs/common';
import { ClientesMongoService } from '../services/clientes.mongodb.service';
import { ClienteCampoClave, Contrato } from '../../types/ClienteMongo';

@Controller('clientes-mongo')
export class ClientesMongoController {
  constructor(private readonly clientesService: ClientesMongoService) {}

  // ✅ Obtener cliente por su ID
  @Get(':cliente_id')
  async obtenerCliente(@Param('cliente_id') cliente_id: string) {
    return await this.clientesService.obtenerCliente(cliente_id);
  }

  // ✅ Actualizar múltiples campos del cliente
  @Patch(':cliente_id')
  async actualizarCliente(
    @Param('cliente_id') cliente_id: string,
    @Body() datos: Partial<Omit<ClienteCampoClave, 'campo' | 'valor'>>
  ) {
    return await this.clientesService.actualizarCliente(cliente_id, datos);
  }

  // ✅ Actualizar campo específico (campo y valor)
  @Patch()
  async actualizarCampo(@Body() dto: ClienteCampoClave) {
    return await this.clientesService.actualizarCampo(dto);
  }

  // ✅ Agregar contrato al cliente
  @Post(':cliente_id/contrato')
  async agregarContrato(
    @Param('cliente_id') cliente_id: string,
    @Body() contrato: Contrato
  ) {
    return await this.clientesService.agregarContrato(cliente_id, contrato);
  }
}
