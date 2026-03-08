import { Controller, Get, Post, Put, Param, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { CrearContratoDto } from '../dto/crear-contrato.dto';
import { ActualizarContratoDto } from '../dto/actualizar-contrato.dto';
import { ContratosMongoService } from '../services/contratos.mongodb.service';

@Controller('contratos')
export class ContratosController {
  constructor(private readonly contratosService: ContratosMongoService) {}

  @Get(':clienteId')
  async listarContratos(@Param('clienteId') clienteId: string) {
    return this.contratosService.getContratosByClienteId(clienteId);
  }

  @Get(':clienteId/:contratoId')
  async verContrato(@Param('clienteId') clienteId: string, @Param('contratoId') contratoId: string) {
    return this.contratosService.getContrato(clienteId, contratoId);
  }

  @Post(':clienteId')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async crearContrato(
    @Param('clienteId') clienteId: string,
    @Body() crearContratoDto: CrearContratoDto,
  ) {
    return this.contratosService.crearContrato(clienteId, crearContratoDto);
  }

  @Put(':clienteId/:contratoId')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async actualizarContrato(
    @Param('clienteId') clienteId: string,
    @Param('contratoId') contratoId: string,
    @Body() actualizarContratoDto: ActualizarContratoDto,
  ) {
    return this.contratosService.actualizarContrato(clienteId, contratoId, actualizarContratoDto);
  }
}
