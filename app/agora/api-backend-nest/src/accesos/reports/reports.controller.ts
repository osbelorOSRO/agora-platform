import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { PanelJwtAuthGuard } from '../../auth/panel-jwt-auth.guard';
import { RequirePermissionGuard } from '../guards/require-permission.guard';
import { RequirePermission } from '../decorators/permission.decorator';

@ApiTags('Reportes')
@ApiBearerAuth('panel-jwt')
@Controller('api/reportes')
@UseGuards(PanelJwtAuthGuard, RequirePermissionGuard)
@RequirePermission('ver_reportes')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  private send(
    result: ReturnType<ReportsService['formatResponse']>,
    res: Response,
  ) {
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
  async procesos(@Query() q: Record<string, string>, @Res() res: Response) {
    this.send(this.service.formatResponse(await this.service.procesos(q)), res);
  }

  @Get('desempeno')
  async desempeno(@Query() q: Record<string, string>, @Res() res: Response) {
    this.send(
      this.service.formatResponse(await this.service.desempeno(q)),
      res,
    );
  }

  @Get('procesos-semanales')
  async procesosSemanales(
    @Query() q: Record<string, string>,
    @Res() res: Response,
  ) {
    this.send(
      this.service.formatResponse(await this.service.procesosSemanales(q)),
      res,
    );
  }

  @Get('precios-planes')
  async preciosPlanes(
    @Query() q: Record<string, string>,
    @Res() res: Response,
  ) {
    this.send(
      this.service.formatResponse(await this.service.preciosPlanes(q)),
      res,
    );
  }

  @Get('clientes-info')
  async clientesInfo(@Query() q: Record<string, string>, @Res() res: Response) {
    this.send(
      this.service.formatResponse(await this.service.clientesInfo(q)),
      res,
    );
  }

  @Get('analisis-ventas')
  async analisisVentas(
    @Query() q: Record<string, string>,
    @Res() res: Response,
  ) {
    this.send(
      this.service.formatResponse(await this.service.analisisVentas(q)),
      res,
    );
  }
}
