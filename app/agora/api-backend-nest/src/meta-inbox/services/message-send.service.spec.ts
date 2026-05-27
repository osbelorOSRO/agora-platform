import axios from 'axios';

jest.mock('axios');
jest.mock('../../shared/runtime-secrets', () => ({
  getRuntimeSecret: jest.fn(),
}));
jest.mock('../../media/media-security', () => ({
  assertTrustedMediaUrl: jest.fn((url: string) => url),
  validateStoredMediaFile: jest.fn(),
  removeFileQuietly: jest.fn(),
  ensureCanonicalExtension: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
  InternalServerErrorException,
} from '@nestjs/common';
import { MessageSendService } from './message-send.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { WEBSOCKET_NOTIFIER_GATEWAY } from '../../websocket-notifier/interfaces/websocket-notifier-gateway.interface';
import { MESSAGE_GATEWAY } from '../../baileys/interfaces/message-gateway.interface';
import { THREAD_GATEWAY } from '../interfaces/thread-gateway.interface';
import {
  META_GRAPH_GATEWAY,
  ThreadMessageMediaType,
} from '../interfaces/meta-graph-api-gateway.interface';
import { MetaGraphApiService } from './meta-graph-api.service';
import { MediaSendService } from './media-send.service';
import { ThreadEventService } from './thread-event.service';
import { getRuntimeSecret } from '../../shared/runtime-secrets';
import { FcaSenderService } from '../../fca/fca-sender.service';

// ─── Identities ──────────────────────────────────────────────────────────────

const WA_IDENTITY = {
  sessionId: 'sess-wa',
  actorExternalId: '56912345678@s.whatsapp.net',
  objectType: 'WHATSAPP',
  sourceChannel: 'baileys_whatsapp',
};

const FB_IDENTITY = {
  sessionId: 'sess-fb',
  actorExternalId: '1234567890',
  objectType: 'FACEBOOK',
  sourceChannel: 'meta_page',
};

const IG_IDENTITY = {
  sessionId: 'sess-ig',
  actorExternalId: '9876543210',
  objectType: 'INSTAGRAM',
  sourceChannel: 'instagram_dm',
};

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPrisma = {
  $queryRawUnsafe: jest.fn(),
  $executeRawUnsafe: jest.fn(),
};

const mockWebsocket = {
  notificarMetaInboxMessageNew: jest.fn(),
  notificarMetaInboxThreadUpsert: jest.fn(),
};

const mockBaileys = {
  enviarMensajeWhatsApp: jest.fn(),
};

const mockThread = {
  getThreadIdentity: jest.fn(),
  getThreadRow: jest.fn(),
  getThreadSnapshot: jest.fn(),
  resolveSessionIdForAutomation: jest.fn(),
  upsertThreadRecord: jest.fn(),
  notifyThreadUpsert: jest.fn(),
};

const mockThreadEvent = {
  recordThreadEvent: jest.fn(),
};

// ─── Setup ───────────────────────────────────────────────────────────────────

const mockMetaGraph = {
  enviarMensaje: jest.fn(),
  resolveSendTransport: jest.fn().mockResolvedValue({}),
  postToGraphWithFallback: jest
    .fn()
    .mockResolvedValue({ data: { message_id: 'meta-msg-001' } }),
  isInstagramThread: jest.fn().mockReturnValue(false),
};
const mockMediaSend = {
  sendMediaWhatsapp: jest.fn(),
  sendMediaMeta: jest.fn(),
  prepareMediaUpload: jest.fn().mockResolvedValue({
    url: 'https://minio.example.com/default.png',
    mediaType: 'image',
    mimeType: 'image/png',
    fileName: 'default.png',
  }),
};

const mockFca = {
  sendMessage: jest.fn().mockResolvedValue({}),
  sendAttachment: jest.fn().mockResolvedValue({}),
};

async function buildService(): Promise<MessageSendService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      MessageSendService,
      { provide: PrismaService, useValue: mockPrisma },
      { provide: WEBSOCKET_NOTIFIER_GATEWAY, useValue: mockWebsocket },
      { provide: MESSAGE_GATEWAY, useValue: mockBaileys },
      { provide: THREAD_GATEWAY, useValue: mockThread },
      { provide: ThreadEventService, useValue: mockThreadEvent },
      { provide: META_GRAPH_GATEWAY, useValue: mockMetaGraph },
      { provide: MediaSendService, useValue: mockMediaSend },
      { provide: FcaSenderService, useValue: mockFca },
    ],
  }).compile();
  return module.get(MessageSendService);
}

describe('MessageSendService', () => {
  let svc: MessageSendService;

  beforeAll(async () => {
    svc = await buildService();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$executeRawUnsafe.mockResolvedValue(1);
    mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
    mockThread.upsertThreadRecord.mockResolvedValue(undefined);
    mockThread.getThreadSnapshot.mockResolvedValue(null);
    mockThread.notifyThreadUpsert.mockResolvedValue(undefined);
    mockThreadEvent.recordThreadEvent.mockResolvedValue(undefined);
    mockWebsocket.notificarMetaInboxMessageNew.mockResolvedValue(undefined);
    mockWebsocket.notificarMetaInboxThreadUpsert.mockResolvedValue(undefined);
  });

  // ──────────────────────────────────────────────
  // sendText()
  // ──────────────────────────────────────────────

  describe('sendText()', () => {
    it('lanza NotFoundException cuando el session no existe', async () => {
      mockThread.getThreadIdentity.mockResolvedValue(null);
      await expect(svc.sendText('sess-ghost', 'Hola')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('enruta a Baileys cuando el thread es WhatsApp', async () => {
      mockThread.getThreadIdentity.mockResolvedValue(WA_IDENTITY);
      mockBaileys.enviarMensajeWhatsApp.mockResolvedValue({
        messageId: 'baileys-msg-001',
      });

      const result = await svc.sendText('sess-wa', 'Hola');

      expect(mockBaileys.enviarMensajeWhatsApp).toHaveBeenCalledWith(
        WA_IDENTITY.actorExternalId,
        'text',
        'Hola',
      );
      expect(result.ok).toBe(true);
      expect(result.externalEventId).toBe('baileys-msg-001');
    });

    it('usa messageId de Baileys como externalEventId cuando está presente', async () => {
      mockThread.getThreadIdentity.mockResolvedValue(WA_IDENTITY);
      mockBaileys.enviarMensajeWhatsApp.mockResolvedValue({
        messageId: 'wamid.abc123',
      });

      const result = await svc.sendText('sess-wa', 'Test');

      expect(result.messageExternalId).toBe('wamid.abc123');
    });

    it('genera externalEventId de fallback cuando Baileys no devuelve messageId', async () => {
      mockThread.getThreadIdentity.mockResolvedValue(WA_IDENTITY);
      mockBaileys.enviarMensajeWhatsApp.mockResolvedValue({});

      const result = await svc.sendText('sess-wa', 'Test');

      expect(result.externalEventId).toMatch(/^baileys:out:/);
      expect(result.messageExternalId).toBeNull();
    });

    it('persiste el mensaje y notifica websocket tras enviar por Baileys', async () => {
      mockThread.getThreadIdentity.mockResolvedValue(WA_IDENTITY);
      mockBaileys.enviarMensajeWhatsApp.mockResolvedValue({
        messageId: 'msg-1',
      });

      await svc.sendText('sess-wa', 'Hola');

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(1);
      expect(mockThread.upsertThreadRecord).toHaveBeenCalledTimes(1);
      expect(mockWebsocket.notificarMetaInboxMessageNew).toHaveBeenCalledTimes(
        1,
      );
    });

    it('lanza UnprocessableEntityException para thread no-WhatsApp sin mensaje entrante previo', async () => {
      mockThread.getThreadIdentity.mockResolvedValue(FB_IDENTITY);
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]); // sin inReplyTo

      await expect(svc.sendText('sess-fb', 'Hola')).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });

    it('envía por Meta Graph API para thread Facebook con inReplyTo', async () => {
      mockThread.getThreadIdentity.mockResolvedValue(FB_IDENTITY);
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { externalEventId: 'ext-incoming-001' },
      ]);

      const result = await svc.sendText('sess-fb', 'Hola desde panel');

      expect(mockMetaGraph.postToGraphWithFallback).toHaveBeenCalledWith(
        expect.objectContaining({
          actorExternalId: FB_IDENTITY.actorExternalId,
        }),
        expect.objectContaining({ message: { text: 'Hola desde panel' } }),
        expect.anything(),
      );
      expect(result.ok).toBe(true);
    });

    it('usa Graph de Instagram para thread IG', async () => {
      mockThread.getThreadIdentity.mockResolvedValue(IG_IDENTITY);
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { externalEventId: 'ext-ig-001' },
      ]);
      mockMetaGraph.isInstagramThread.mockReturnValueOnce(true);

      await svc.sendText('sess-ig', 'Hola IG');

      expect(mockMetaGraph.postToGraphWithFallback).toHaveBeenCalledWith(
        expect.objectContaining({ objectType: 'INSTAGRAM' }),
        expect.any(Object),
        expect.anything(),
      );
    });
  });

  // ──────────────────────────────────────────────
  // sendSystemText()
  // ──────────────────────────────────────────────

  describe('sendSystemText()', () => {
    it('resuelve sessionId y envía con senderType SYSTEM (vía Baileys)', async () => {
      mockThread.resolveSessionIdForAutomation.mockResolvedValue('sess-wa');
      mockThread.getThreadIdentity.mockResolvedValue(WA_IDENTITY);
      mockThread.getThreadRow.mockResolvedValue({ sessionId: 'sess-wa' });
      mockBaileys.enviarMensajeWhatsApp.mockResolvedValue({
        messageId: 'sys-msg-001',
      });

      const result = await svc.sendSystemText({
        sessionId: 'sess-wa',
        text: 'Mensaje del sistema',
      });

      expect(result.ok).toBe(true);
      expect(result).toHaveProperty('thread');
      expect(mockThread.resolveSessionIdForAutomation).toHaveBeenCalledTimes(1);
    });

    it('incluye thread row en el resultado', async () => {
      const threadRow = { sessionId: 'sess-wa', threadStatus: 'OPEN' };
      mockThread.resolveSessionIdForAutomation.mockResolvedValue('sess-wa');
      mockThread.getThreadIdentity.mockResolvedValue(WA_IDENTITY);
      mockThread.getThreadRow.mockResolvedValue(threadRow);
      mockBaileys.enviarMensajeWhatsApp.mockResolvedValue({
        messageId: 'msg-x',
      });

      const result = await svc.sendSystemText({
        sessionId: 'sess-wa',
        text: 'msg',
      });

      expect(result.thread).toBe(threadRow);
    });
  });

  // ──────────────────────────────────────────────
  // sendThreadMessage()
  // ──────────────────────────────────────────────

  describe('sendThreadMessage()', () => {
    beforeEach(() => {
      mockThread.resolveSessionIdForAutomation.mockResolvedValue('sess-wa');
    });

    it('lanza BadRequestException cuando no hay text ni mediaUrl', async () => {
      await expect(
        svc.sendThreadMessage({ sessionId: 'sess-wa' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza BadRequestException cuando hay mediaUrl pero no mediaType', async () => {
      await expect(
        svc.sendThreadMessage({
          sessionId: 'sess-wa',
          mediaUrl: 'https://cdn.example.com/img.png',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('envía texto cuando no hay mediaUrl', async () => {
      mockThread.getThreadIdentity.mockResolvedValue(WA_IDENTITY);
      mockThread.getThreadRow.mockResolvedValue({ sessionId: 'sess-wa' });
      mockBaileys.enviarMensajeWhatsApp.mockResolvedValue({
        messageId: 'msg-txt',
      });

      const result = await svc.sendThreadMessage({
        sessionId: 'sess-wa',
        text: 'Hola',
      });

      expect(result).toHaveProperty('ok', true);
      expect(mockBaileys.enviarMensajeWhatsApp).toHaveBeenCalledTimes(1);
    });

    it('envía media por Baileys cuando hay mediaUrl + mediaType para WhatsApp', async () => {
      mockThread.getThreadIdentity.mockResolvedValue(WA_IDENTITY);
      mockThread.getThreadRow.mockResolvedValue({ sessionId: 'sess-wa' });
      mockBaileys.enviarMensajeWhatsApp.mockResolvedValue({
        messageId: 'media-msg-1',
      });

      const result = await svc.sendThreadMessage({
        sessionId: 'sess-wa',
        mediaUrl: 'https://cdn.example.com/img.png',
        mediaType: 'image',
      });

      expect(result).toHaveProperty('ok', true);
      expect(result).toHaveProperty('mediaType', 'image');
    });

    it('usa senderType HUMAN por defecto', async () => {
      mockThread.getThreadIdentity.mockResolvedValue(WA_IDENTITY);
      mockThread.getThreadRow.mockResolvedValue(null);
      mockBaileys.enviarMensajeWhatsApp.mockResolvedValue({
        messageId: 'msg-h',
      });

      await svc.sendThreadMessage({ sessionId: 'sess-wa', text: 'Test' });

      expect(mockThreadEvent.recordThreadEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventSource: 'HUMAN' }),
      );
    });
  });

  // ──────────────────────────────────────────────
  // sendMedia()
  // ──────────────────────────────────────────────

  describe('sendMedia()', () => {
    const mockFile = {
      path: '/tmp/agora-uploads/file.png',
      filename: 'file.png',
    } as Express.Multer.File;

    it('lanza NotFoundException cuando el session no existe', async () => {
      mockThread.getThreadIdentity.mockResolvedValue(null);
      await expect(
        svc.sendMedia('sess-ghost', mockFile),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('sube archivo a Minio y envía por Baileys para WhatsApp', async () => {
      mockThread.getThreadIdentity.mockResolvedValue(WA_IDENTITY);
      mockMediaSend.prepareMediaUpload.mockResolvedValue({
        url: 'https://minio.example.com/file.png',
        mediaType: 'image',
        mimeType: 'image/png',
        fileName: 'file.png',
      });
      mockBaileys.enviarMensajeWhatsApp.mockResolvedValue({
        messageId: 'media-wa-1',
      });

      const result = await svc.sendMedia('sess-wa', mockFile);

      expect(mockMediaSend.prepareMediaUpload).toHaveBeenCalledTimes(1);
      expect(result).toHaveProperty('ok', true);
      expect(result).toHaveProperty('mediaType', 'image');
    });
  });

  // ──────────────────────────────────────────────
  // Métodos privados — isInstagramThread()
  // ──────────────────────────────────────────────

  describe('isInstagramThread() [privado]', () => {
    const metaGraphSvc = new MetaGraphApiService();
    const call = (objectType: string, sourceChannel: string | null) =>
      metaGraphSvc.isInstagramThread(objectType, sourceChannel);

    it('devuelve true cuando objectType contiene INSTAGRAM', () => {
      expect(call('INSTAGRAM', null)).toBe(true);
    });

    it('devuelve true cuando objectType contiene IG', () => {
      expect(call('IG_DM', null)).toBe(true);
    });

    it('devuelve true cuando sourceChannel contiene instagram', () => {
      expect(call('FACEBOOK', 'instagram_dm')).toBe(true);
    });

    it('devuelve true cuando sourceChannel contiene ig', () => {
      expect(call('FACEBOOK', 'ig_messaging')).toBe(true);
    });

    it('devuelve false para thread Facebook sin canal Instagram', () => {
      expect(call('FACEBOOK', 'meta_page')).toBe(false);
    });

    it('devuelve false para thread WhatsApp', () => {
      expect(call('WHATSAPP', 'baileys_whatsapp')).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // isWhatsAppThread()
  // ──────────────────────────────────────────────

  describe('isWhatsAppThread() [privado]', () => {
    const call = (objectType: string) =>
      (svc as any).isWhatsAppThread(objectType);

    it('devuelve true para WHATSAPP exacto', () =>
      expect(call('WHATSAPP')).toBe(true));
    it('devuelve true para whatsapp en minúsculas (normaliza a upper)', () =>
      expect(call('whatsapp')).toBe(true));
    it('devuelve false para FACEBOOK', () =>
      expect(call('FACEBOOK')).toBe(false));
    it('devuelve false para INSTAGRAM', () =>
      expect(call('INSTAGRAM')).toBe(false));
    it('devuelve false para string vacío', () => expect(call('')).toBe(false));
  });

  // ──────────────────────────────────────────────
  // resolveMediaPlaceholder()
  // ──────────────────────────────────────────────

  describe('resolveMediaPlaceholder() [privado]', () => {
    const call = (type: string) => (svc as any).resolveMediaPlaceholder(type);

    it('audio → [audio]', () => expect(call('audio')).toBe('[audio]'));
    it('image → [imagen]', () => expect(call('image')).toBe('[imagen]'));
    it('video → [video]', () => expect(call('video')).toBe('[video]'));
    it('document → [documento]', () =>
      expect(call('document')).toBe('[documento]'));
  });

  // ──────────────────────────────────────────────
  // resolveGraphAttachmentType()
  // ──────────────────────────────────────────────

  describe('resolveGraphAttachmentType() [privado]', () => {
    const metaGraphSvc2 = new MetaGraphApiService();
    const call = (
      mediaType: string,
      thread: { objectType: string; sourceChannel: string | null },
    ) =>
      metaGraphSvc2.resolveGraphAttachmentType(
        mediaType as ThreadMessageMediaType,
        thread,
      );

    it('mapea document → "file" para thread no-Instagram', () => {
      expect(
        call('document', { objectType: 'FACEBOOK', sourceChannel: null }),
      ).toBe('file');
    });

    it('lanza BadRequestException para document en thread Instagram', () => {
      expect(() =>
        call('document', { objectType: 'INSTAGRAM', sourceChannel: null }),
      ).toThrow(BadRequestException);
    });

    it('mapea image → "image"', () => {
      expect(
        call('image', { objectType: 'FACEBOOK', sourceChannel: null }),
      ).toBe('image');
    });

    it('mapea audio → "audio"', () => {
      expect(
        call('audio', { objectType: 'INSTAGRAM', sourceChannel: null }),
      ).toBe('audio');
    });

    it('mapea video → "video"', () => {
      expect(
        call('video', { objectType: 'FACEBOOK', sourceChannel: null }),
      ).toBe('video');
    });
  });

  // ──────────────────────────────────────────────
  // extractBaileysMessageId()
  // ──────────────────────────────────────────────

  describe('extractBaileysMessageId() [privado]', () => {
    const call = (response: any) =>
      (svc as any).extractBaileysMessageId(response);

    it('extrae response.messageId cuando está presente', () => {
      expect(call({ messageId: 'wamid.abc' })).toBe('wamid.abc');
    });

    it('extrae response.message_id cuando messageId no existe', () => {
      expect(call({ message_id: 'wamid.xyz' })).toBe('wamid.xyz');
    });

    it('extrae response.key.id para el formato de Baileys nativo', () => {
      expect(call({ key: { id: 'wamid.key123' } })).toBe('wamid.key123');
    });

    it('extrae response.data.messageId cuando el mensaje está anidado en data', () => {
      expect(call({ data: { messageId: 'wamid.nested' } })).toBe(
        'wamid.nested',
      );
    });

    it('devuelve null cuando no hay ningún campo reconocible', () => {
      expect(call({})).toBeNull();
    });

    it('devuelve null cuando la respuesta es null', () => {
      expect(call(null)).toBeNull();
    });

    it('ignora cadenas vacías y pasa al siguiente candidato', () => {
      expect(call({ messageId: '', message_id: 'wamid.fallback' })).toBe(
        'wamid.fallback',
      );
    });
  });

  // ──────────────────────────────────────────────
  // buildOutgoingBaileysEventId()
  // ──────────────────────────────────────────────

  describe('buildOutgoingBaileysEventId() [privado]', () => {
    const call = (actor: string) =>
      (svc as any).buildOutgoingBaileysEventId(actor);

    it('genera ID con prefijo baileys:out:', () => {
      expect(call('56912345678@s.whatsapp.net')).toMatch(/^baileys:out:/);
    });

    it('sanitiza caracteres especiales del actor', () => {
      const id = call('actor con espacios!');
      expect(id).not.toContain(' ');
      expect(id).not.toContain('!');
    });

    it('usa "unknown" cuando el actor está vacío', () => {
      expect(call('')).toContain('unknown');
    });
  });

  // ──────────────────────────────────────────────
  // resolveSendTransport()
  // ──────────────────────────────────────────────

  describe('resolveSendTransport() [privado]', () => {
    const metaGraphSvc3 = new MetaGraphApiService();
    const call = (objectType: string, sourceChannel: string | null) =>
      metaGraphSvc3.resolveSendTransport(objectType, sourceChannel);

    it('lanza BadRequestException para objectType WHATSAPP', async () => {
      await expect(call('WHATSAPP', null)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('devuelve graphUrl de Facebook para thread FACEBOOK', async () => {
      (getRuntimeSecret as jest.Mock).mockResolvedValue('page-token-abc');
      const transport = await call('FACEBOOK', null);
      expect(transport.graphUrl).toContain('graph.facebook.com');
      expect(transport.accessToken).toBe('page-token-abc');
    });

    it('devuelve graphUrl de Instagram para thread INSTAGRAM', async () => {
      (getRuntimeSecret as jest.Mock).mockResolvedValue('ig-token-xyz');
      const transport = await call('INSTAGRAM', 'instagram_dm');
      expect(transport.graphUrl).toContain('graph.instagram.com');
    });
  });

  // ──────────────────────────────────────────────
  // resolveAccessToken()
  // ──────────────────────────────────────────────

  describe('resolveAccessToken() [privado]', () => {
    const metaGraphSvc4 = new MetaGraphApiService();
    const call = (objectType: string, sourceChannel: string | null) =>
      (metaGraphSvc4 as any).resolveAccessToken(objectType, sourceChannel);

    it('retorna token de Instagram para objectType INSTAGRAM', async () => {
      (getRuntimeSecret as jest.Mock).mockResolvedValue('ig-token');
      expect(await call('INSTAGRAM', null)).toBe('ig-token');
      expect(getRuntimeSecret).toHaveBeenCalledWith(
        'META_INSTAGRAM_ACCESS_TOKEN',
      );
    });

    it('retorna page token para objectType FACEBOOK', async () => {
      (getRuntimeSecret as jest.Mock).mockResolvedValue('page-token');
      expect(await call('FACEBOOK', null)).toBe('page-token');
      expect(getRuntimeSecret).toHaveBeenCalledWith('META_PAGE_ACCESS_TOKEN');
    });

    it('lanza InternalServerErrorException cuando no hay page token configurado', async () => {
      (getRuntimeSecret as jest.Mock).mockResolvedValue(null);
      await expect(call('FACEBOOK', null)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });

    it('lanza InternalServerErrorException cuando no hay token de Instagram configurado', async () => {
      (getRuntimeSecret as jest.Mock).mockResolvedValue(undefined);
      await expect(call('INSTAGRAM', null)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });

    it('detecta Instagram por sourceChannel aunque objectType sea FACEBOOK', async () => {
      (getRuntimeSecret as jest.Mock).mockResolvedValue('ig-channel-token');
      await call('FACEBOOK', 'instagram_dm');
      expect(getRuntimeSecret).toHaveBeenCalledWith(
        'META_INSTAGRAM_ACCESS_TOKEN',
      );
    });
  });

  // ──────────────────────────────────────────────
  // postToGraphWithFallback()
  // ──────────────────────────────────────────────

  describe('postToGraphWithFallback() [privado]', () => {
    const thread = { objectType: 'FACEBOOK', sourceChannel: null };
    const transport = {
      graphUrl: 'https://graph.facebook.com/v21.0/me/messages',
      accessToken: 'token-abc',
    };
    const body = { recipient: { id: '123' }, message: { text: 'Hola' } };
    const metaGraphSvc5 = new MetaGraphApiService();

    const call = (t: any, b: any, p: any) =>
      metaGraphSvc5.postToGraphWithFallback(t, b, p);

    it('devuelve respuesta de axios en caso exitoso', async () => {
      const response = { data: { message_id: 'meta-001' } };
      (axios.post as jest.Mock).mockResolvedValue(response);
      const result = await call(thread, body, transport);
      expect(result.data.message_id).toBe('meta-001');
    });

    it('lanza BadRequestException para error code 100 subcode 2534080 (audio IG)', async () => {
      const axiosError = {
        response: {
          data: {
            error: {
              code: 100,
              error_subcode: 2534080,
              message: 'Unsupported audio',
            },
          },
        },
      };
      (axios.post as jest.Mock).mockRejectedValue(axiosError);
      await expect(call(thread, body, transport)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('re-lanza otros errores de axios sin transformar', async () => {
      const networkError = new Error('ECONNREFUSED');
      (axios.post as jest.Mock).mockRejectedValue(networkError);
      await expect(call(thread, body, transport)).rejects.toBe(networkError);
    });
  });
});
