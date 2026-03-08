import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { ProcesosMongoService } from '../services/procesos.mongodb.service';
import { Proceso } from '../schemas/proceso.schema';


@Controller('mongo/procesos')
export class ProcesosController {
  constructor(private readonly procesosService: ProcesosMongoService) {}

  @Post()
  async crearProceso(@Body() data: Partial<Proceso>) {
    return await this.procesosService.crearProceso(data);
  }

  @Get('cliente/:cliente_id')
  async obtenerPorCliente(@Param('cliente_id') cliente_id: string) {
    return await this.procesosService.obtenerPorCliente(cliente_id);
  }

  @Get(':proceso_id')
  async obtenerPorProcesoId(@Param('proceso_id') proceso_id: string) {
    const proceso = await this.procesosService.obtenerPorProcesoId(proceso_id);
    if (!proceso) throw new NotFoundException('Proceso no encontrado');
    return proceso;
  }

  @Patch(':proceso_id')
  async actualizarProceso(
    @Param('proceso_id') proceso_id: string,
    @Body() data: Partial<Proceso>,
  ) {
    const actualizado = await this.procesosService.actualizarProceso(proceso_id, data);
    if (!actualizado) throw new NotFoundException('Proceso no encontrado');
    return actualizado;
  }

  @Post(':proceso_id/conversacion')
  async agregarConversacion(
    @Param('proceso_id') proceso_id: string,
    @Body() conversacion: Proceso['conversaciones'][0],
  ) {
    return await this.procesosService.agregarConversacion(proceso_id, conversacion);
  }

  @Post(':proceso_id/subproceso')
  async agregarSubproceso(
    @Param('proceso_id') proceso_id: string,
    @Body() subproceso: Proceso['subprocesos'][0],
  ) {
    return await this.procesosService.agregarSubproceso(proceso_id, subproceso);
  }

  @Post(':proceso_id/contrato')
  async agregarContrato(
    @Param('proceso_id') proceso_id: string,
    @Body() contrato: Proceso['contratos'][0],
  ) {
    return await this.procesosService.agregarContrato(proceso_id, contrato);
  }

 @Get(':proceso_id/conversaciones')
  async obtenerConversaciones(@Param('proceso_id') proceso_id: string) {
   return await this.procesosService.obtenerConversacionesOrdenadas(proceso_id);
 }
 }
