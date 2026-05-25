export const MESSAGE_GATEWAY = Symbol('MESSAGE_GATEWAY');

export interface IMessageGateway {
  enviarMensajeWhatsApp(
    clienteId: string,
    tipo: 'text' | 'image' | 'audio' | 'document' | 'video',
    contenido: string,
    tipoId?: string,
    urlArchivo?: string,
    options?: { fileName?: string; mimeType?: string },
  ): Promise<any>;

  updateBlockStatus(input: {
    action: 'block' | 'unblock';
    phone?: string | null;
    jid?: string | null;
    pnJid?: string | null;
    lidJid?: string | null;
  }): Promise<any>;
}
