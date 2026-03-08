import {
  Controller,
  Post,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Get,
  NotFoundException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { ProcesosPgService } from './procesos_pg.service';
import { CreateProcesoDto } from './dto/create-proceso.dto';
import { CreateMensajeDto } from './dto/create-mensaje.dto';
import path from 'path';

const storage = diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

@Controller('procesos-pg')
export class ProcesosPgController {
  constructor(private readonly procesosPgService: ProcesosPgService) {}

  @Post()
  async crearProceso(@Body() dto: CreateProcesoDto) {
    return await this.procesosPgService.crearProceso(dto);
  }

  @Post(':proceso_id/mensaje')
  @UseInterceptors(FileInterceptor('archivo'))
  async enviarMensaje(
    @Param('proceso_id') proceso_id: string,
    @UploadedFile() archivo: Express.Multer.File,
    @Body() body: any,
  ) {
    const dto: CreateMensajeDto = {
      contenido: body.contenido,
      tipo: body.tipo,
      usuario: body.usuario,
      tipoId: body.tipoId,
    };

    if (!body.tipoId) {
      throw new BadRequestException('El parámetro tipoId es obligatorio');
    }

    return await this.procesosPgService.enviarMensaje(+proceso_id, dto, body.tipoId);
  }

  @Get('cliente/:cliente_id')
  async obtenerProcesoPorCliente(@Param('cliente_id') cliente_id: string) {
    const proceso = await this.procesosPgService.obtenerProcesoActivoPorCliente(cliente_id);

    if (!proceso) {
      throw new NotFoundException('No hay proceso activo para este cliente');
    }

    return proceso;
  }

  @Post(':proceso_id/nota-voz')
  @UseInterceptors(FileInterceptor('archivo', { storage }))
  async enviarNotaVoz(
    @Param('proceso_id') proceso_id: string,
    @UploadedFile() archivo: Express.Multer.File,
    @Body('usuario') usuario: string,
    @Body('tipoId') tipoId: string,
  ) {
    if (!archivo || !usuario || !tipoId) {
      throw new BadRequestException('Archivo, usuario o tipoId faltante');
    }
    return await this.procesosPgService.enviarNotaVoz(+proceso_id, archivo, usuario, tipoId);
  }

  @Post(':proceso_id/archivo')
  @UseInterceptors(FileInterceptor('archivo', { storage }))
  async enviarArchivoGeneral(
    @Param('proceso_id') proceso_id: string,
    @UploadedFile() archivo: Express.Multer.File,
    @Body('usuario') usuario: string,
    @Body('tipo') tipo: 'imagen' | 'documento' | 'video',
    @Body('tipoId') tipoId: string,
  ) {
    if (!archivo || !usuario || !tipo || !tipoId) {
      throw new BadRequestException('Archivo, tipo, usuario o tipoId faltante');
    }

    return await this.procesosPgService.enviarArchivoGeneral(+proceso_id, archivo, tipo, usuario, tipoId);
  }

  @Post('cerrar')
  async cerrarProceso(@Body() body: {
    proceso_id: string;
    tipo_proceso: string;
    tipo_cierre: string;
    abandono: boolean;
    cerrado_por_id: string;
    fuente?: string; // <-- Agregado para pasar fuente
  }) {
    return await this.procesosPgService.cerrarProcesoManual(body);
  }
}
