// src/websocket-notifier/websocket-notifier.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { getRuntimeSecret } from '../shared/runtime-secrets';

@Injectable()
export class WebsocketNotifierService {
  private readonly logger = new Logger(WebsocketNotifierService.name);
  private readonly baseUrl: string = process.env.WS_SERVER || '';

  constructor(private readonly httpService: HttpService) {}

  private async getApiKey(): Promise<string> {
    return getRuntimeSecret('API_KEY_WS');
  }

  async notificarCambioEstado(clienteId: string, estadoActual: number, etiquetaActual: string): Promise<void> {
    try {
      const apiKey = await this.getApiKey();
      const url = `${this.baseUrl}/notify/cambio-estado`;
      await firstValueFrom(
        this.httpService.post(
          url,
          { clienteId, estadoActual, etiquetaActual, timestamp: new Date().toISOString() },
          { headers: { 'x-api-key': apiKey } },
        ),
      );
      this.logger.log(`✅ Notificado cambio de estado para cliente ${clienteId} → ${etiquetaActual}`);
    } catch (error: any) {
      this.logger.error(`❌ Error notificando cambio de estado: ${error.message}`, error.stack);
    }
  }

  async notificarClienteCreado(clienteId: string, tipoId: string, nombre: string, fotoPerfil?: string): Promise<void> {
    try {
      const apiKey = await this.getApiKey();
      const url = `${this.baseUrl}/notify/cliente-creado`;
      await firstValueFrom(
        this.httpService.post(
          url,
          { clienteId, tipoId, nombre, fotoPerfil, timestamp: new Date().toISOString() },
          { headers: { 'x-api-key': apiKey } },
        ),
      );
      this.logger.log(`✅ Notificado cliente creado: ${clienteId} (${nombre})`);
    } catch (error: any) {
      this.logger.error(`❌ Error notificando cliente creado: ${error.message}`, error.stack);
    }
  }

  async notificarProcesoCreado(clienteId: string, procesoId: string): Promise<void> {
    try {
      const apiKey = await this.getApiKey();
      const url = `${this.baseUrl}/notify/proceso-creado`;
      await firstValueFrom(
        this.httpService.post(
          url,
          { clienteId, procesoId, timestamp: new Date().toISOString() },
          { headers: { 'x-api-key': apiKey } },
        ),
      );
      this.logger.log(`✅ Notificado proceso creado para cliente ${clienteId}`);
    } catch (error: any) {
      this.logger.error(`❌ Error notificando proceso creado: ${error.message}`, error.stack);
    }
  }

  async notificarCambioIntervencion(clienteId: string, intervenida: boolean): Promise<void> {
    try {
      const apiKey = await this.getApiKey();
      const url = `${this.baseUrl}/notify/cambio-intervencion`;
      await firstValueFrom(
        this.httpService.post(
          url,
          { clienteId, intervenida, timestamp: new Date().toISOString() },
          { headers: { 'x-api-key': apiKey } },
        ),
      );
      this.logger.log(`✅ Notificado cambio intervención para cliente ${clienteId} → ${intervenida ? 'SI' : 'NO'}`);
    } catch (error: any) {
      this.logger.error(`❌ Error notificando cambio intervención: ${error.message}`, error.stack);
    }
  }

  async notificarProcesoCerrado(clienteId: string, procesoId: string): Promise<void> {
    try {
      const apiKey = await this.getApiKey();
      const url = `${this.baseUrl}/notify/proceso-cerrado`;
      await firstValueFrom(
        this.httpService.post(
          url,
          { clienteId, procesoId, timestamp: new Date().toISOString() },
          { headers: { 'x-api-key': apiKey } },
        ),
      );
      this.logger.log(`✅ Notificado proceso cerrado para cliente ${clienteId}`);
    } catch (error: any) {
      this.logger.error(`❌ Error notificando proceso cerrado: ${error.message}`, error.stack);
    }
  }

  async notificarMetaInboxMessageNew(payload: Record<string, unknown>): Promise<void> {
    try {
      const apiKey = await this.getApiKey();
      const url = `${this.baseUrl}/notify/meta-inbox/message-new`;
      await firstValueFrom(
        this.httpService.post(url, payload, { headers: { 'x-api-key': apiKey } }),
      );
    } catch (error: any) {
      this.logger.error(`❌ Error notificando meta inbox message: ${error.message}`, error.stack);
    }
  }

  async notificarMetaInboxThreadUpsert(payload: Record<string, unknown>): Promise<void> {
    try {
      const apiKey = await this.getApiKey();
      const url = `${this.baseUrl}/notify/meta-inbox/thread-upsert`;
      await firstValueFrom(
        this.httpService.post(url, payload, { headers: { 'x-api-key': apiKey } }),
      );
    } catch (error: any) {
      this.logger.error(`❌ Error notificando meta inbox thread: ${error.message}`, error.stack);
    }
  }

  async notificarRefrescarClientes(data: { clienteId: string }): Promise<void> {
    try {
      const apiKey = await this.getApiKey();
      const url = `${this.baseUrl}/notify/refrescar-clientes`;
      await firstValueFrom(this.httpService.post(url, data, { headers: { 'x-api-key': apiKey } }));
      this.logger.log(`✅ Notificación refrescar clientes enviada para clienteId: ${data.clienteId}`);
    } catch (error: any) {
      this.logger.error(`❌ Error notificando refrescar clientes: ${error.message}`, error.stack);
    }
  }
}
