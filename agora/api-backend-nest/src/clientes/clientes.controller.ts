import {
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  Body,
  BadRequestException,
  NotFoundException,
  Query,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientesService } from './clientes.service';
import {
  IntervencionContextoDto,
  ActualizarEtiquetaDto,
  VerificarClienteDto,
  CrearClienteManualDto,
  CrearClienteDesdeBotDto,
  CrearEtiquetaDto,
  ModoPilotoDto,
  NotificarCambioEstadoDto,
  ClienteResponseDto,
  ActualizarEtiquetaResponseDto,
  CrearClienteConProcesoResponseDto,
  ActualizarEtiquetaN8nDto,
} from './dto';
import { ProcesosPgService } from '../procesos_pg/procesos_pg.service';
import { WebsocketNotifierService } from '../websocket-notifier/websocket-notifier.service';
import { getRuntimeSecret } from '../shared/runtime-secrets';

type Filtro = 'activos' | 'cerrados' | 'inactivos' | 'todos';
type EstadoDerivado = 'ACTIVO' | 'CERRADO' | 'INACTIVO';

type ClienteConEstado = {
  estado_derivado: EstadoDerivado;
};

@Controller('clientes')
export class ClientesController {
  constructor(
    private readonly clientesService: ClientesService,
    private readonly procesosPgService: ProcesosPgService,
    private readonly websocketNotifierService: WebsocketNotifierService,
  ) {}

  // ---------- Unificado (opcional): /clientes?filtro=activos|cerrados|inactivos|todos ----------
  @Get()
  async listar(@Query('filtro') filtro: Filtro = 'activos') {
    return this.clientesService.listar({ filtro });
  }

  // ---------- Listas separadas ----------
  @Get('activos')
  async listarActivos() {
    return this.clientesService.listarActivos();
  }

  @Get('cerrados')
  async listarCerrados() {
    return this.clientesService.listarCerrados();
  }

  @Get('inactivos')
  async listarInactivos() {
    return this.clientesService.listarInactivos();
  }

  // ---------- Resumen para tabs/counters ----------
  @Get('resumen')
  async resumen() {
    const todos = await this.clientesService.listar({ filtro: 'todos' });

    const lista = todos as ClienteConEstado[];

    const activos = lista.filter(c => c.estado_derivado === 'ACTIVO').length;
    const cerrados = lista.filter(c => c.estado_derivado === 'CERRADO').length;
    const inactivos = lista.filter(c => c.estado_derivado === 'INACTIVO').length;

    return { activos, cerrados, inactivos, total: lista.length };
  }

  // ---------- Crear manual ----------
  @Post(':cliente_id/manual')
  async crearManual(
    @Param('cliente_id') cliente_id: string,
    @Body() dto: CrearClienteManualDto,
  ): Promise<CrearClienteConProcesoResponseDto> {
    // Verifica consistencia en los IDs
    if (dto.cliente_id && dto.cliente_id !== cliente_id) {
      throw new BadRequestException('cliente_id del body no coincide con el de la URL');
    }

    const creado = await this.clientesService.crearManual(
      cliente_id,
      dto.tipo_id,
      dto.nombre,
      dto.foto_perfil,
    );

    if (!creado) throw new BadRequestException('Ya existe');

    const proceso = await this.procesosPgService.obtenerProcesoActivoPorCliente(cliente_id);

    return {
      mensaje: 'Cliente y proceso creados correctamente',
      cliente: creado,
      proceso_id: proceso?.id ?? null,
    };
  }

  // ---------- Crear desde bot ----------
  @Post('bot/crear')
  async crearDesdeBot(
    @Body() dto: CrearClienteDesdeBotDto,
  ): Promise<{ mensaje: string; cliente: ClienteResponseDto }> {
    const { cliente_id, tipo_id, nombre, foto_perfil } = dto;

    const creado = await this.clientesService.crearDesdeBot(
      cliente_id,
      tipo_id,
      nombre,
      foto_perfil,
    );

    if (!creado) throw new BadRequestException('Ya existe');

    return {
      mensaje: 'Cliente creado correctamente',
      cliente: creado,
    };
  }

  // ---------- Eliminar ----------
  @Delete(':cliente_id')
  async eliminar(@Param('cliente_id') cliente_id: string) {
    await this.clientesService.eliminar(cliente_id);
    return { mensaje: 'Cliente eliminado correctamente' };
  }

  // 🔥 OPTIMIZADO: Actualizar etiqueta y retornar ambos campos
  @Patch(':cliente_id/etiqueta')
  async actualizarYObtenerEtiqueta(
    @Param('cliente_id') cliente_id: string,
    @Body() dto: ActualizarEtiquetaDto,
  ): Promise<ActualizarEtiquetaResponseDto> {
    const result = await this.clientesService.actualizarYObtenerEtiqueta(
      cliente_id,
      dto.etiqueta_id,
      dto.fuente,
      dto.proceso_id,
    );

    // 🔥 RETORNAR AMBOS CAMPOS (el service ya los devuelve)
    return {
      ok: result.ok,
      estado_actual: result.estado_actual,
      etiqueta_actual: result.etiqueta_actual,
    };
  }

  // 🔥 NUEVO ENDPOINT: Para que N8N notifique cambios al frontend
  @Post('notificar-cambio-estado')
  async notificarCambioEstadoDesdeN8N(@Body() dto: NotificarCambioEstadoDto) {
    await this.websocketNotifierService.notificarCambioEstado(
      dto.cliente_id,
      dto.nuevo_estado,
      dto.nueva_etiqueta,
    );

    return {
      success: true,
      message: 'Notificación enviada al frontend',
    };
  }

  @Post('etiquetas')
  async crearEtiqueta(@Body() dto: CrearEtiquetaDto) {
    return this.clientesService.crearEtiqueta(dto.nombre_etiqueta);
  }

  // ---------- GET por id ----------
  @Get(':cliente_id')
  async obtenerClientePorId(@Param('cliente_id') cliente_id: string) {
    return this.clientesService.obtenerClientePorId(cliente_id);
  }

  // ---------- Debug ----------
  @Get('debug/db')
  async debug() {
    const resultado = await this.clientesService.debugRawQuery();
    return resultado;
  }

  // ---------- Verificar existencia ----------
  @Post('verificar')
  async verificarExistencia(@Body() dto: VerificarClienteDto) {
    const existe = await this.clientesService.verificarExistencia(dto.cliente_id, dto.tipo_id);
    if (!existe) throw new NotFoundException('Cliente no existe');
    return { existe: true };
  }

  // ---------- Modo piloto ----------
@Post('modo-piloto/estado')
async verificarModoPiloto(@Body() body: ModoPilotoDto) {
  console.log('[CONTROLLER] 🔹 Body recibido en /modo-piloto/estado:', body);

  const resultado = await this.clientesService.verificarModoPiloto(
    body.cliente_id,
    body.msg_mode,
  );

  return resultado;
}

  // ---------- Intervención manual ----------
  @Patch(':cliente_id/intervencion')
  async cambiarIntervencionManual(
    @Param('cliente_id') cliente_id: string,
    @Body('intervenida') intervenida: boolean,
  ) {
    return this.clientesService.actualizarIntervencionManual(cliente_id, intervenida);
  }

  // ---------- Actualizar nombre ----------
  @Patch('actualizar-nombre')
  async actualizarNombrePG(@Body() body: { cliente_id: string; nuevo_nombre: string }) {
    const { cliente_id, nuevo_nombre } = body;
    await this.clientesService.actualizarNombrePostgres(cliente_id, nuevo_nombre);
    return { success: true };
  }


@Post(':cliente_id/etiqueta-n8n')
async actualizarEtiquetaDesdeN8N(
  @Param('cliente_id') cliente_id: string,
  @Body() dto: ActualizarEtiquetaN8nDto,
  @Headers('x-api-key') apiKey: string,
) {
  const validApiKey = await getRuntimeSecret('N8N_API_KEY');
  if (!apiKey || apiKey !== validApiKey) {
    throw new UnauthorizedException('API Key inválida');
  }

  const fecha = dto.fecha || new Date();
  const resultado = await this.clientesService.actualizarEtiquetaDesdeN8N(
    cliente_id,
    dto.etiqueta_id,
    dto.fuente,   
    dto.proceso_id,
    fecha,
  );

  return {
    success: true,
    message: 'Etiqueta actualizada y frontend notificado',
    estado_actual: resultado.estado_actual,
    etiqueta_actual: resultado.etiqueta_actual,
  };
}

}
