import { of, throwError } from 'rxjs';
import * as runtimeSecrets from '../shared/runtime-secrets';
import { WebsocketNotifierService } from './websocket-notifier.service';

const makeHttp = (response: unknown = { data: 'ok' }) => ({
  post: jest.fn().mockReturnValue(of(response)),
});

const setup = (httpResponse?: unknown) => {
  process.env.WS_SERVER = 'http://localhost:5050';
  jest
    .spyOn(runtimeSecrets, 'getRuntimeSecret')
    .mockResolvedValue('test-api-key');
  const http = makeHttp(httpResponse);
  const svc = new WebsocketNotifierService(http as any);
  return { svc, http };
};

afterEach(() => jest.restoreAllMocks());

describe('WebsocketNotifierService', () => {
  it('notificarCambioEstado llama al endpoint correcto', async () => {
    const { svc, http } = setup();
    await svc.notificarCambioEstado('cliente-1', 2, 'activo');
    expect(http.post).toHaveBeenCalledWith(
      'http://localhost:5050/notify/cambio-estado',
      expect.objectContaining({ clienteId: 'cliente-1', estadoActual: 2 }),
      expect.objectContaining({ headers: { 'x-api-key': 'test-api-key' } }),
    );
  });

  it('notificarCambioEstado no lanza si el WS falla (error silenciado)', async () => {
    process.env.WS_SERVER = 'http://localhost:5050';
    jest.spyOn(runtimeSecrets, 'getRuntimeSecret').mockResolvedValue('key');
    const http = {
      post: jest.fn().mockReturnValue(throwError(() => new Error('timeout'))),
    };
    const svc = new WebsocketNotifierService(http as any);
    await expect(
      svc.notificarCambioEstado('c', 1, 'label'),
    ).resolves.toBeUndefined();
  });

  it('notificarClienteCreado envía nombre y fotoPerfil', async () => {
    const { svc, http } = setup();
    await svc.notificarClienteCreado('c1', 'WHATSAPP', 'Juan', 'foto.jpg');
    expect(http.post).toHaveBeenCalledWith(
      expect.stringContaining('cliente-creado'),
      expect.objectContaining({ nombre: 'Juan', fotoPerfil: 'foto.jpg' }),
      expect.anything(),
    );
  });

  it('notificarProcesoCreado envía clienteId y procesoId', async () => {
    const { svc, http } = setup();
    await svc.notificarProcesoCreado('c1', 'p1');
    expect(http.post).toHaveBeenCalledWith(
      expect.stringContaining('proceso-creado'),
      expect.objectContaining({ clienteId: 'c1', procesoId: 'p1' }),
      expect.anything(),
    );
  });

  it('notificarCambioIntervencion envía el flag correctamente', async () => {
    const { svc, http } = setup();
    await svc.notificarCambioIntervencion('c1', true);
    expect(http.post).toHaveBeenCalledWith(
      expect.stringContaining('cambio-intervencion'),
      expect.objectContaining({ intervenida: true }),
      expect.anything(),
    );
  });

  it('notificarRefrescarClientes envía clienteId', async () => {
    const { svc, http } = setup();
    await svc.notificarRefrescarClientes({ clienteId: 'c1' });
    expect(http.post).toHaveBeenCalledWith(
      expect.stringContaining('refrescar-clientes'),
      expect.objectContaining({ clienteId: 'c1' }),
      expect.anything(),
    );
  });

  it('notificarFcaMqttStatus envía el payload', async () => {
    const { svc, http } = setup();
    await svc.notificarFcaMqttStatus({
      mqtt_connected: true,
      event: 'connected',
      fb_user_id: 'u1',
      fb_user_name: 'User',
    });
    expect(http.post).toHaveBeenCalledWith(
      expect.stringContaining('fca/mqtt-status'),
      expect.objectContaining({ mqtt_connected: true }),
      expect.anything(),
    );
  });

  it('notificarMetaInboxMessageNew envía el payload', async () => {
    const { svc, http } = setup();
    await svc.notificarMetaInboxMessageNew({
      sessionId: 'session-1',
      id: 'msg-1',
    });
    expect(http.post).toHaveBeenCalledWith(
      expect.stringContaining('meta-inbox/message-new'),
      expect.objectContaining({ sessionId: 'session-1' }),
      expect.anything(),
    );
  });

  it('notificarMetaInboxThreadUpsert envía el thread', async () => {
    const { svc, http } = setup();
    await svc.notificarMetaInboxThreadUpsert({ sessionId: 'sess-1' });
    expect(http.post).toHaveBeenCalledWith(
      expect.stringContaining('meta-inbox/thread-upsert'),
      expect.objectContaining({ sessionId: 'sess-1' }),
      expect.anything(),
    );
  });
});
