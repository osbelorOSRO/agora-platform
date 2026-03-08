import { Controller, Get, Param, Query, DefaultValuePipe, ParseIntPipe, Post, Body } from '@nestjs/common';
import { ClientesService } from './clientes.service';

@Controller('clientes-lite')
export class ClientesLiteController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get('lite')
  listarLite(
    @Query('search') search = '',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
  ) {
    return this.clientesService.listarLite({ search, page, limit });
  }

  @Get('lite/:cliente_id')
  obtenerLite(@Param('cliente_id') cliente_id: string) {
    return this.clientesService.obtenerLitePorId(cliente_id);
  }
  // SOLO proceso (no crea cliente)
  @Post('abrir-o-continuar')
  abrirOContinuar(@Body() body: { cliente_id: string; iniciado_por_id: number }) {
    return this.clientesService.abrirOContinuarProceso(body);
  }

}
