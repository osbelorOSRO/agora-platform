import axios from 'axios';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { CoreIncomingMessage } from '../../core/whatsapp/index.js';
import { backendApiClient } from '../../infrastructure/backend-api.client.js';
import { WhatsAppGateway } from '../whatsapp.gateway.js';
import { WelcomeFlowUseCase } from './welcome-flow.usecase.js';
import { env } from '../../config/env.js';
import { conectarSocketBot, getSocketBot } from '../../infrastructure/socket/socket.client.js';

type TipoId = 'jid' | 'lid';
type MsgTipo = 'texto' | 'imagen' | 'audio' | 'video' | 'documento';

export class HandleIncomingMessageUseCase {
  constructor(
    private readonly gateway: WhatsAppGateway,
    private readonly welcomeFlow: WelcomeFlowUseCase = new WelcomeFlowUseCase(gateway)
  ) {}

  // ===============================
  // META AUTO DETECTION
  // ===============================

  private readonly META_AUTO_SIGNATURES = [
    'gracias por escribirnos',
    'para ayudarte mas rapido'
  ];

  private metaAutoMessageMap = new Map<string, number>();
  private readonly META_TTL_MS = 10 * 60 * 1000; // 10 minutos

  private normalizeText(text: string): string {
    return text
      ?.toLowerCase()
      ?.normalize('NFD')
      ?.replace(/[\u0300-\u036f]/g, '')
      ?.replace(/[^\w\s]/g, '')
      ?.replace(/\s+/g, ' ')
      ?.trim();
  }

  private extractTextDeep(msg: any): string {
    const m =
      msg?.message?.ephemeralMessage?.message ||
      msg?.message?.viewOnceMessage?.message ||
      msg?.message?.viewOnceMessageV2?.message ||
      msg?.message;

    return (
      m?.conversation ||
      m?.extendedTextMessage?.text ||
      m?.imageMessage?.caption ||
      m?.videoMessage?.caption ||
      m?.documentMessage?.caption ||
      ''
    );
  }

  // ===============================

  async execute(event: CoreIncomingMessage): Promise<void> {
    const upsert = event.raw as any;
    const msg = upsert?.messages?.[0];
    if (!msg?.message) return;

    // =====================================
    // DETECTAR MENSAJE AUTOMÁTICO META
    // =====================================
    if (msg?.key?.fromMe) {
      let remoteForMeta = this.obtenerIdClienteDefinitivo(msg.key);

      // Priorizar PN real si existe
      if (
        typeof msg?.key?.remoteJidAlt === 'string' &&
        msg.key.remoteJidAlt.endsWith('@s.whatsapp.net')
      ) {
        remoteForMeta = msg.key.remoteJidAlt;
      }

      const extractedMeta = this.extraerClienteYTipo(remoteForMeta);

      const text = this.extractTextDeep(msg);
      const normalized = this.normalizeText(text);

      if (extractedMeta && normalized) {
        const isMetaAuto = this.META_AUTO_SIGNATURES.some(sig =>
          normalized.includes(sig)
        );

        if (isMetaAuto) {
          const key = `jid:${extractedMeta.cliente_id}`;
          this.metaAutoMessageMap.set(key, Date.now());
          console.log(`🟢 Detectado mensaje automático Meta: ${extractedMeta.cliente_id}`);
        }
      }
    }

    if (this.isIgnorableMessage(msg)) return;

    const rawRemote = String(msg?.key?.remoteJid || '');
    if (
      rawRemote.endsWith('@g.us') ||
      rawRemote === 'status@broadcast' ||
      rawRemote.endsWith('@broadcast') ||
      rawRemote.includes('@newsletter')
    ) {
      return;
    }

    let remoteJid = this.obtenerIdClienteDefinitivo(msg.key);

    if (remoteJid.endsWith('@lid') || remoteJid.endsWith('@lid.c.us')) {
      if (
        typeof msg?.key?.senderPn === 'string' &&
        msg.key.senderPn.endsWith('@s.whatsapp.net')
      ) {
        remoteJid = msg.key.senderPn;
      } else if (
        typeof msg?.key?.senderKey === 'string' &&
        msg.key.senderKey.endsWith('@s.whatsapp.net')
      ) {
        remoteJid = msg.key.senderKey;
      }
    }

    const extracted = this.extraerClienteYTipo(remoteJid);
    if (!extracted) return;

    const { cliente_id, tipo_id } = extracted;

    const parsed = await this.parseMessage(msg, cliente_id, tipo_id);
    if (!parsed) return;

    const timestamp = new Date(
      (Number(msg.messageTimestamp) || Math.floor(Date.now() / 1000)) * 1000
    );

    const nombre = msg.pushName || 'Cliente desde bot';
    const fotoPerfil = await this.resolveProfilePicture(remoteJid);

    const exists = await backendApiClient.verificarCliente(cliente_id, tipo_id);
    if (!exists) {
      await backendApiClient.crearClienteBot(cliente_id, tipo_id, nombre, fotoPerfil);
    }

    let procesoId = await backendApiClient.obtenerProcesoPorCliente(cliente_id);
    if (!procesoId) {
      procesoId = await backendApiClient.crearProceso(cliente_id);
    }

    await backendApiClient.guardarConversacion(procesoId, {
      contenido: parsed.contenido,
      tipo: parsed.tipo,
      direccion: 'input',
      fecha_envio: timestamp.toISOString(),
      url_archivo: parsed.url_archivo ?? null,
    });

    // NUEVO: enviar modo del mensaje actual a modo piloto
    const msg_mode: 'audio' | 'no_audio' = parsed.tipo === 'audio' ? 'audio' : 'no_audio';
    const estado = await backendApiClient.obtenerEstadoModoPiloto(cliente_id, msg_mode);

    // =====================================
    // BLOQUE SALUDO CON CONTROL META
    // =====================================
    if (estado.saludar) {
      const key = `jid:${cliente_id}`;
      const ts = this.metaAutoMessageMap.get(key);

      const isFresh =
        typeof ts === 'number' &&
        Date.now() - ts <= this.META_TTL_MS;

      if (isFresh) {
        this.metaAutoMessageMap.delete(key);
        console.log(`🟡 Saludo omitido por Meta auto: ${cliente_id}`);
        // NO return → sigue flujo normal
      } else {
        if (ts) this.metaAutoMessageMap.delete(key);

        const destino = this.buildJid(cliente_id, tipo_id);
        await this.welcomeFlow.execute(destino);
        return;
      }
    }

    // =====================================
    // DERIVACIÓN HUMANO / PILOTO
    // =====================================
    try {
      await conectarSocketBot();
      const socketHumano = getSocketBot();

      socketHumano.emit('emitirGlobito', {
        usuario_id: '12',
        clienteId: cliente_id,
        contenido: parsed.contenido,
        fecha_envio: new Date().toISOString(),
      });
    } catch {}

    if (estado.usar_piloto) {
      const webhook =
        process.env.N8N_WEBHOOK_URL ||
        'http://n8n:5678/webhook/flujo-ventas';

      await axios.post(webhook, {
        cliente_id,
        contenido: parsed.contenido,
        tipo: parsed.tipo,
        url_archivo: parsed.url_archivo ?? null,
      });

      console.log(`✅ Derivado a n8n: ${cliente_id}`);
      return;
    }

    try {
      await conectarSocketBot();
      const socketHumano = getSocketBot();

      socketHumano.emit('nuevoMensaje', {
        clienteId: cliente_id,
        contenido: parsed.contenido,
        direccion_mensaje: 'input',
        fecha_envio: timestamp.toISOString(),
        tipo: parsed.tipo,
        url_archivo: parsed.url_archivo ?? null,
      });

      console.log(`👤 Derivado a humano: ${cliente_id}`);
    } catch {}
  }

  private isIgnorableMessage(msg: any): boolean {
    const fromMe = !!msg?.key?.fromMe;
    const tipo = Object.keys(msg?.message || {})[0];

    return (
      fromMe ||
      !msg?.message ||
      tipo === 'protocolMessage' ||
      tipo === 'senderKeyDistributionMessage' ||
      tipo === 'messageContextInfo'
    );
  }

  private obtenerIdClienteDefinitivo(msgKey: any): string {
    const posiblesIds = [
      msgKey?.remoteJid,
      msgKey?.remoteJidAlt,
      msgKey?.senderKey,
      msgKey?.senderPn,
    ].filter((id) => typeof id === 'string');

    for (const id of posiblesIds) {
      if (id.endsWith('@s.whatsapp.net')) {
        return id;
      }
    }

    return posiblesIds[0] || '';
  }

  private extraerClienteYTipo(remoteJid: string): { cliente_id: string; tipo_id: TipoId } | null {
    if (typeof remoteJid !== 'string') return null;

    if (remoteJid.endsWith('@s.whatsapp.net')) {
      return { cliente_id: remoteJid.replace('@s.whatsapp.net', ''), tipo_id: 'jid' };
    }

    if (remoteJid.endsWith('@lid')) {
      return { cliente_id: remoteJid.replace('@lid', ''), tipo_id: 'lid' };
    }

    if (remoteJid.endsWith('@lid.c.us')) {
      return { cliente_id: remoteJid.replace('@lid.c.us', ''), tipo_id: 'lid' };
    }

    return null;
  }

  private async parseMessage(
    msg: any,
    cliente_id: string,
    tipo_id: TipoId
  ): Promise<{ tipo: MsgTipo; contenido: string; url_archivo?: string } | null> {
    const m = msg.message;

    if (m.conversation || m.extendedTextMessage?.text) {
      return {
        tipo: 'texto',
        contenido: m.conversation || m.extendedTextMessage?.text || '',
      };
    }

    if (m.imageMessage || m.audioMessage || m.videoMessage || m.documentMessage) {
      let tipo: MsgTipo = 'imagen';
      let contenido = '';
      let ext = 'bin';

      if (m.imageMessage) {
        tipo = 'imagen';
        contenido = m.imageMessage.caption || '';
        ext = 'jpg';
      } else if (m.audioMessage) {
        tipo = 'audio';
        ext = 'ogg';
      } else if (m.videoMessage) {
        tipo = 'video';
        contenido = m.videoMessage.caption || '';
        ext = 'mp4';
      } else if (m.documentMessage) {
        tipo = 'documento';
        contenido = m.documentMessage.caption || '';
        ext = m.documentMessage.fileName?.split('.').pop() || 'pdf';
      }

      const buffer = (await downloadMediaMessage(msg, 'buffer', {} as any)) as Buffer;
      if (!buffer || !buffer.length) return null;

      const filename = `${cliente_id}-${Date.now()}.${ext}`;
      const url_archivo = await backendApiClient.guardarMedia(
        buffer,
        filename,
        cliente_id,
        tipo,
        tipo_id
      );

      return {
        tipo,
        contenido: contenido || `[${tipo}]`,
        url_archivo,
      };
    }

    return {
      tipo: 'texto',
      contenido: '[mensaje no soportado]',
    };
  }

  private async resolveProfilePicture(remoteJid: string): Promise<string> {
    try {
      const pp = await this.gateway.getSocket().profilePictureUrl(remoteJid, 'image');
      if (pp) return pp;
    } catch {}

    return `${env.mediaBaseUrl}/uploads/avatares/foto_perfil_hombre_default_02.png`;
  }

  private buildJid(cliente_id: string, tipo_id: TipoId): string {
    return tipo_id === 'jid'
      ? `${cliente_id}@s.whatsapp.net`
      : `${cliente_id}@lid`;
  }
}
