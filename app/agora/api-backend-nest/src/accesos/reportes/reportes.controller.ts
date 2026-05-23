import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ReportesService } from './reportes.service';
import { PanelJwtAuthGuard } from '../../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../guards/require-permission.guard';
import { RequierePermiso } from '../decorators/permiso.decorator';

@Controller('api/reportes')
@UseGuards(PanelJwtAuthGuard, RequirePermissionGuard)
@RequierePermiso('ver_reportes')
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  private send(result: ReturnType<ReportesService['formatResponse']>, res: Response) {
    if (result.headers) {
      Object.entries(result.headers).forEach(([k, v]) => res.setHeader(k, v));
      res.status(200).send(result.body);
    } else {
      res.json(result.body);
    }
  }

  @Get()
  catalogo(@Res() res: Response) {
    res.json(this.service.catalogo());
  }

  @Get('procesos')
  async procesos(@Query() q: any, @Res() res: Response) {
    this.send(this.service.formatResponse(await this.service.procesos(q)), res);
  }

  @Get('desempeno')
  async desempeno(@Query() q: any, @Res() res: Response) {
    this.send(this.service.formatResponse(await this.service.desempeno(q)), res);
  }

  @Get('procesos-semanales')
  async procesosSemanales(@Query() q: any, @Res() res: Response) {
    this.send(this.service.formatResponse(await this.service.procesosSemanales(q)), res);
  }

  @Get('precios-planes')
  async preciosPlanes(@Query() q: any, @Res() res: Response) {
    this.send(this.service.formatResponse(await this.service.preciosPlanes(q)), res);
  }

  @Get('clientes-info')
  async clientesInfo(@Query() q: any, @Res() res: Response) {
    this.send(this.service.formatResponse(await this.service.clientesInfo(q)), res);
  }
}
