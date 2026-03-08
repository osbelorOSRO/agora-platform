import { WhatsAppGateway } from '../whatsapp.gateway.js';
import { conectarSocketBot, getSocketBot } from '../../infrastructure/socket/socket.client.js';
import { runtimeState } from '../../shared/runtime-state.js';

export interface SendMessageInput {
  destino: string;
  tipo: 'texto';
  contenido: unknown;
  tipoId: 'jid' | 'lid';
}

export class SendMessageUseCase {
  constructor(private readonly gateway: WhatsAppGateway) {}

  async execute(input: SendMessageInput): Promise<void> {
    const cliente_id = input.destino.includes('@')
      ? input.destino.split('@')[0]
      : input.destino;

    const to = `${cliente_id}@${input.tipoId === 'jid' ? 's.whatsapp.net' : 'lid'}`;

    const text =
      typeof input.contenido === 'string'
        ? input.contenido
        : (input.contenido as { text?: string; caption?: string } | undefined)?.text ||
          (input.contenido as { text?: string; caption?: string } | undefined)?.caption ||
          '';

    if (!text) {
      throw new Error('Mensaje vacío: no hay texto para enviar');
    }

    await this.gateway.sendMessage(to, { text });
    runtimeState.markOutgoing();

    try {
      await conectarSocketBot();
      const socketHumano = getSocketBot();

      socketHumano.emit('joinRoom', cliente_id);

      socketHumano.emit('mensajeOutput', {
        cliente_id,
        contenido: text,
        tipo: 'texto',
        direccion_mensaje: 'output',
        fecha_envio: new Date().toISOString(),
        usuario: 'baileysbot',
        url_archivo: null,
      });

      socketHumano.emit('nuevoMensaje', {
        clienteId: cliente_id,
        contenido: text,
        tipo: 'texto',
        direccion_mensaje: 'output',
        fecha_envio: new Date().toISOString(),
        url_archivo: null,
      });
    } catch {
      // noop
    }
  }
}
