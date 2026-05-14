import { WhatsAppGateway } from '../whatsapp.gateway.js';
import { runtimeState } from '../../shared/runtime-state.js';
import { toBaileysOutgoingCommand } from './baileys-outgoing-command.js';

export interface SendMessageInput {
  destino?: string;
  tipo: 'text';
  contenido: unknown;
  tipoId?: 'jid' | 'lid';
  actorExternalId?: string;
  recipientId?: string;
  payload?: unknown;
  message?: unknown;
}

export class SendMessageUseCase {
  constructor(private readonly gateway: WhatsAppGateway) {}

  async execute(input: SendMessageInput): Promise<void> {
    const command = toBaileysOutgoingCommand(input);

    await this.gateway.sendMessage(command.to, { text: command.text });
    runtimeState.markOutgoing();
  }
}
