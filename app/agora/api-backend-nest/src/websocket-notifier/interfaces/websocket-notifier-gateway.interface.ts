export const WEBSOCKET_NOTIFIER_GATEWAY = Symbol('WEBSOCKET_NOTIFIER_GATEWAY');

export interface IWebsocketNotifierGateway {
  notificarCambioEstado(clienteId: string, estadoActual: number, etiquetaActual: string): Promise<void>;
  notificarClienteCreado(clienteId: string, tipoId: string, nombre: string, fotoPerfil?: string): Promise<void>;
  notificarProcesoCreado(clienteId: string, procesoId: string): Promise<void>;
  notificarCambioIntervencion(clienteId: string, intervenida: boolean): Promise<void>;
  notificarProcesoCerrado(clienteId: string, procesoId: string): Promise<void>;
  notificarMetaInboxMessageNew(payload: Record<string, unknown>): Promise<void>;
  notificarMetaInboxThreadUpsert(payload: Record<string, unknown>): Promise<void>;
  notificarRefrescarClientes(data: { clienteId: string }): Promise<void>;
  notificarGlobito(payload: { actorExternalId: string; contenido?: string; fecha_envio?: string; phone?: string }): Promise<void>;
}
