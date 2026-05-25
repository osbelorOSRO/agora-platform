import { Test } from '@nestjs/testing';
import { IncomingMessagePersistenceService } from './incoming-message-persistence.service';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { WEBSOCKET_NOTIFIER_GATEWAY } from '../../../websocket-notifier/interfaces/websocket-notifier-gateway.interface';
import { MetaInboxService } from '../../../meta-inbox/meta-inbox.service';
import { ConversationBootstrapService } from '../../bootstrap/conversation-bootstrap.service';
import { MessageNormalizerService } from './message-normalizer.service';
import { IncomingMessageEnvelope } from '../incoming-message-envelope';

const BASE_ENV: IncomingMessageEnvelope = {
  externalEventId: 'evt-abc-001',
  actorExternalId: '56912345678',
  provider: 'META',
  objectType: 'PAGE',
  pipeline: 'MESSAGES',
  eventType: 'messaging.message',
  occurredAt: '2024-01-15T10:00:00.000Z',
  payload: { message: { mid: 'mid-001', text: 'Hola' } },
};

const OPEN_THREAD = { session_id: 'META:PAGE:56912345678', thread_status: 'OPEN' };

type PrismaMock = ReturnType<typeof buildPrisma>;

function buildPrisma(): {
  threads: { findFirst: jest.Mock; update: jest.Mock };
  thread_messages: { findFirst: jest.Mock };
  $queryRawUnsafe: jest.Mock;
  $executeRawUnsafe: jest.Mock;
} {
  return {
    threads: {
      findFirst: jest.fn().mockResolvedValue(OPEN_THREAD),
      update: jest.fn().mockResolvedValue({}),
    },
    thread_messages: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    $queryRawUnsafe: jest.fn().mockResolvedValue([{ externalEventId: BASE_ENV.externalEventId }]),
    $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
  };
}

function buildNormalizer(overrides?: Partial<Record<string, jest.Mock>>) {
  return {
    resolveDirection: jest.fn().mockReturnValue('INCOMING'),
    extractIncomingMedia: jest.fn().mockReturnValue(null),
    resolveVisibleContentText: jest.fn().mockReturnValue('Hola'),
    resolveIncomingMediaCaption: jest.fn().mockReturnValue(null),
    resolveSourceChannel: jest.fn().mockReturnValue(null),
    resolveMessageType: jest.fn().mockReturnValue('text'),
    resolveSenderType: jest.fn().mockReturnValue('USER'),
    resolveStructuredPayload: jest.fn().mockReturnValue({}),
    normalizeWhatsappIdentity: jest.fn().mockReturnValue(null),
    normalizeExternalAdContext: jest.fn().mockReturnValue(null),
    extractWhatsappPhone: jest.fn().mockReturnValue(null),
    ...(overrides ?? {}),
  };
}

async function buildService(prisma: PrismaMock, normalizerOverrides?: Partial<Record<string, jest.Mock>>) {
  const websocketNotifier = {
    notificarMetaInboxMessageNew: jest.fn().mockResolvedValue(undefined),
    notificarMetaInboxThreadUpsert: jest.fn().mockResolvedValue(undefined),
    notificarGlobito: jest.fn().mockResolvedValue(undefined),
  };
  const metaInbox = { recordThreadEvent: jest.fn().mockResolvedValue(undefined) };
  const conversationBootstrap = {
    decideForFirstIncoming: jest.fn().mockReturnValue({ shouldWelcome: false, reason: 'no_config' }),
  };

  const module = await Test.createTestingModule({
    providers: [
      IncomingMessagePersistenceService,
      { provide: PrismaService, useValue: prisma },
      { provide: WEBSOCKET_NOTIFIER_GATEWAY, useValue: websocketNotifier },
      { provide: MetaInboxService, useValue: metaInbox },
      { provide: ConversationBootstrapService, useValue: conversationBootstrap },
      { provide: MessageNormalizerService, useValue: buildNormalizer(normalizerOverrides) },
    ],
  }).compile();

  return {
    service: module.get(IncomingMessagePersistenceService),
    websocketNotifier,
    metaInbox,
    conversationBootstrap,
  };
}

describe('IncomingMessagePersistenceService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('persistMessageSession', () => {
    it('retorna inserted:false y no notifica cuando el evento es duplicado (ON CONFLICT DO NOTHING)', async () => {
      const prisma = buildPrisma();
      prisma.$queryRawUnsafe.mockResolvedValue([]); // RETURNING vacío = conflicto

      const { service, websocketNotifier, metaInbox } = await buildService(prisma);

      const result = await service.persistMessageSession(BASE_ENV);

      expect(result).toEqual({ inserted: false, primedFirstDelegate: false });
      expect(websocketNotifier.notificarMetaInboxMessageNew).not.toHaveBeenCalled();
      expect(metaInbox.recordThreadEvent).not.toHaveBeenCalled();
    });

    it('retorna inserted:true y notifica cuando el evento es nuevo (thread existente)', async () => {
      const prisma = buildPrisma(); // $queryRawUnsafe ya devuelve [{ externalEventId }] por defecto

      const { service, websocketNotifier, metaInbox } = await buildService(prisma);

      const result = await service.persistMessageSession(BASE_ENV);

      expect(result).toEqual({ inserted: true, primedFirstDelegate: false });
      expect(websocketNotifier.notificarMetaInboxMessageNew).toHaveBeenCalledTimes(1);
      expect(websocketNotifier.notificarMetaInboxThreadUpsert).toHaveBeenCalledTimes(1);
      expect(metaInbox.recordThreadEvent).toHaveBeenCalledTimes(1);
    });

    it('primedFirstDelegate:true para primer mensaje INCOMING de actor sin thread ni historial previo', async () => {
      const prisma = buildPrisma();
      prisma.threads.findFirst.mockResolvedValue(null);
      prisma.thread_messages.findFirst.mockResolvedValue(null);

      const { service, conversationBootstrap } = await buildService(prisma);

      const result = await service.persistMessageSession(BASE_ENV);

      expect(result.inserted).toBe(true);
      expect(result.primedFirstDelegate).toBe(true);
      expect(conversationBootstrap.decideForFirstIncoming).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'META', objectType: 'PAGE' }),
      );
    });

    it('primedFirstDelegate:false cuando direction es OUTGOING aunque sea actor sin thread', async () => {
      const prisma = buildPrisma();
      prisma.threads.findFirst.mockResolvedValue(null);
      prisma.thread_messages.findFirst.mockResolvedValue(null);

      const { service } = await buildService(prisma, {
        resolveDirection: jest.fn().mockReturnValue('OUTGOING'),
      });

      const result = await service.persistMessageSession(BASE_ENV);

      expect(result.primedFirstDelegate).toBe(false);
    });
  });

  describe('handlePageEcho', () => {
    it('retorna sin consultar BD ni notificar cuando no hay recipientId en el payload', async () => {
      const prisma = buildPrisma();
      const { service, websocketNotifier } = await buildService(prisma);
      const env: IncomingMessageEnvelope = { ...BASE_ENV, payload: {} };

      await service.handlePageEcho(env);

      expect(prisma.threads.findFirst).not.toHaveBeenCalled();
      expect(websocketNotifier.notificarMetaInboxMessageNew).not.toHaveBeenCalled();
    });

    it('retorna sin notificar cuando no existe thread para el recipient', async () => {
      const prisma = buildPrisma();
      prisma.threads.findFirst.mockResolvedValue(null);

      const { service, websocketNotifier } = await buildService(prisma);
      const env: IncomingMessageEnvelope = {
        ...BASE_ENV,
        payload: { recipientId: '56900000000' },
      };

      await service.handlePageEcho(env);

      expect(websocketNotifier.notificarMetaInboxMessageNew).not.toHaveBeenCalled();
    });

    it('inserta echo y notifica cuando existe thread para el recipient', async () => {
      const prisma = buildPrisma();
      prisma.threads.findFirst.mockResolvedValue({ session_id: 'META:PAGE:56900000000' });
      prisma.$queryRawUnsafe.mockResolvedValue([]);

      const { service, websocketNotifier } = await buildService(prisma);
      const env: IncomingMessageEnvelope = {
        ...BASE_ENV,
        payload: { recipientId: '56900000000', message: { mid: 'mid-echo-001', text: 'Echo' } },
      };

      await service.handlePageEcho(env);

      expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
      expect(websocketNotifier.notificarMetaInboxMessageNew).toHaveBeenCalledTimes(1);
      expect(websocketNotifier.notificarMetaInboxThreadUpsert).toHaveBeenCalledTimes(1);
    });
  });
});
