import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  ThreadService,
  ThreadRow,
  ThreadControlSnapshot,
} from './thread.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { WEBSOCKET_NOTIFIER_GATEWAY } from '../../websocket-notifier/interfaces/websocket-notifier-gateway.interface';
import { ThreadEventService } from './thread-event.service';
import { CacheService } from '../../cache/cache.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeThreadRow = (overrides: Partial<ThreadRow> = {}): ThreadRow => ({
  threadId: 'thread-uuid-1',
  sessionId: 'sess-001',
  actorExternalId: '56912345678@s.whatsapp.net',
  objectType: 'WHATSAPP',
  sourceChannel: 'baileys_whatsapp',
  threadStatus: 'OPEN',
  attentionMode: 'HUMAN',
  threadStage: 'inicio',
  metadata: null,
  displayName: 'Test User',
  firstName: null,
  lastName: null,
  phone: '+56912345678',
  rut: null,
  address: null,
  email: null,
  notes: null,
  city: null,
  region: null,
  whatsappBlockStatus: null,
  whatsappBlockUpdatedAt: null,
  whatsappBlockJidUsed: null,
  actorScore: null,
  actorLifecycleState: null,
  actorLifecycleUpdatedAt: null,
  lastMessageText: null,
  lastDirection: 'INCOMING',
  lastMessageAt: new Date('2024-01-15T10:00:00Z'),
  ...overrides,
});

const makeSnapshot = (
  overrides: Partial<ThreadControlSnapshot> = {},
): ThreadControlSnapshot => ({
  threadId: 'thread-uuid-1',
  sessionId: 'sess-001',
  actorExternalId: '56912345678@s.whatsapp.net',
  objectType: 'WHATSAPP',
  sourceChannel: 'baileys_whatsapp',
  threadStatus: 'OPEN',
  attentionMode: 'BOT',
  threadStage: 'inicio',
  stageControl: null,
  lastMessageText: null,
  lastDirection: 'INCOMING',
  lastMessageAt: new Date('2024-01-15T10:00:00Z'),
  ...overrides,
});

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPrisma = {
  $queryRawUnsafe: jest.fn(),
  $executeRawUnsafe: jest.fn(),
  meta_inbox_contacts: { findUnique: jest.fn() },
  threads: { findFirst: jest.fn(), upsert: jest.fn() },
};

const mockWebsocket = {
  notificarMetaInboxThreadUpsert: jest.fn(),
};

const mockThreadEvent = {
  recordThreadEvent: jest.fn(),
};

// ─── Setup ───────────────────────────────────────────────────────────────────

async function buildService(): Promise<ThreadService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ThreadService,
      { provide: PrismaService, useValue: mockPrisma },
      { provide: WEBSOCKET_NOTIFIER_GATEWAY, useValue: mockWebsocket },
      { provide: ThreadEventService, useValue: mockThreadEvent },
      {
        provide: CacheService,
        useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
      },
    ],
  }).compile();
  return module.get(ThreadService);
}

describe('ThreadService', () => {
  let svc: ThreadService;

  beforeAll(async () => {
    svc = await buildService();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$executeRawUnsafe.mockResolvedValue(1);
    mockThreadEvent.recordThreadEvent.mockResolvedValue(undefined);
    mockWebsocket.notificarMetaInboxThreadUpsert.mockResolvedValue(undefined);
  });

  // ──────────────────────────────────────────────
  // listThreads()
  // ──────────────────────────────────────────────

  describe('listThreads()', () => {
    it('pasa los parámetros calculados a $queryRawUnsafe', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      await svc.listThreads({ limit: 20, offset: 10, includeClosed: false });
      const sql: string = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      expect(sql).toContain('LIMIT 20');
      expect(sql).toContain('OFFSET 10');
      expect(sql).toContain('false');
    });

    it('clampea limit al máximo de 200', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      await svc.listThreads({ limit: 999 });
      const sql: string = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      expect(sql).toContain('LIMIT 200');
    });

    it('clampea limit al mínimo de 1', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      await svc.listThreads({ limit: 0 });
      const sql: string = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      expect(sql).toContain('LIMIT 1');
    });

    it('usa limit 50 por defecto cuando no se especifica', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      await svc.listThreads({});
      const sql: string = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      expect(sql).toContain('LIMIT 50');
    });

    it('usa offset 0 cuando se pasa negativo', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      await svc.listThreads({ offset: -5 });
      const sql: string = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      expect(sql).toContain('OFFSET 0');
    });

    it('incluye threads cerrados cuando includeClosed=true', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      await svc.listThreads({ includeClosed: true });
      const sql: string = mockPrisma.$queryRawUnsafe.mock.calls[0][0];
      expect(sql).toContain('true');
      expect(sql).not.toContain('false OR');
    });

    it('devuelve array de ThreadRow directamente desde Prisma', async () => {
      const rows = [makeThreadRow()];
      mockPrisma.$queryRawUnsafe.mockResolvedValue(rows);
      const result = await svc.listThreads({});
      expect(result).toBe(rows);
    });
  });

  // ──────────────────────────────────────────────
  // ensureWhatsappThreadForContact()
  // ──────────────────────────────────────────────

  describe('ensureWhatsappThreadForContact()', () => {
    const JID = '56912345678@s.whatsapp.net';

    it('lanza BadRequestException cuando el JID no termina en @s.whatsapp.net', async () => {
      await expect(
        svc.ensureWhatsappThreadForContact('56912345678'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza BadRequestException cuando el contacto no existe en BD', async () => {
      mockPrisma.meta_inbox_contacts.findUnique.mockResolvedValue(null);
      await expect(
        svc.ensureWhatsappThreadForContact(JID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    describe('ruta A — thread abierto existente', () => {
      it('reutiliza el thread abierto sin crear uno nuevo', async () => {
        mockPrisma.meta_inbox_contacts.findUnique.mockResolvedValue({
          actor_external_id: JID,
        });
        mockPrisma.threads.findFirst.mockResolvedValue({
          session_id: 'sess-existing',
        });
        const existingRow = makeThreadRow({
          sessionId: 'sess-existing',
          threadStatus: 'OPEN',
        });
        mockPrisma.$queryRawUnsafe.mockResolvedValue([existingRow]);

        const result = await svc.ensureWhatsappThreadForContact(JID);

        expect(result.sessionId).toBe('sess-existing');
        expect(mockPrisma.threads.upsert).not.toHaveBeenCalled();
        expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(1);
      });

      it('activa el thread ARCHIVED al reutilizarlo (UPDATE status → OPEN)', async () => {
        mockPrisma.meta_inbox_contacts.findUnique.mockResolvedValue({
          actor_external_id: JID,
        });
        mockPrisma.threads.findFirst.mockResolvedValue({
          session_id: 'sess-archived',
        });
        const archivedRow = makeThreadRow({
          sessionId: 'sess-archived',
          threadStatus: 'ARCHIVED',
        });
        mockPrisma.$queryRawUnsafe.mockResolvedValue([archivedRow]);

        await svc.ensureWhatsappThreadForContact(JID);

        const updateSql: string = mockPrisma.$executeRawUnsafe.mock.calls[0][0];
        expect(updateSql).toContain("thread_status = 'ARCHIVED'");
      });
    });

    describe('ruta B — sin thread abierto pero con historial', () => {
      it('crea thread con sessionId único cuando ya existe historial previo', async () => {
        mockPrisma.meta_inbox_contacts.findUnique.mockResolvedValue({
          actor_external_id: JID,
        });
        mockPrisma.threads.findFirst
          .mockResolvedValueOnce(null) // sin thread abierto
          .mockResolvedValueOnce({ session_id: 'prev-sess' }); // con historial
        const newRow = makeThreadRow({
          sessionId: `BAILEYS:WHATSAPP:${JID}:new`,
        });
        mockPrisma.$queryRawUnsafe.mockResolvedValue([newRow]);
        mockPrisma.threads.upsert.mockResolvedValue({});

        const result = await svc.ensureWhatsappThreadForContact(JID);

        expect(mockPrisma.threads.upsert).toHaveBeenCalledTimes(1);
        // El sessionId upserted no debe ser el base puro — tiene timestamp añadido
        const upsertArg = mockPrisma.threads.upsert.mock.calls[0][0];
        expect(upsertArg.where.session_id).not.toBe(`BAILEYS:WHATSAPP:${JID}`);
        expect(result).toBeDefined();
      });
    });

    describe('ruta C — sin historial previo', () => {
      it('crea thread con sessionId base cuando no existe ningún thread previo', async () => {
        mockPrisma.meta_inbox_contacts.findUnique.mockResolvedValue({
          actor_external_id: JID,
        });
        mockPrisma.threads.findFirst.mockResolvedValue(null);
        const newRow = makeThreadRow({ sessionId: `BAILEYS:WHATSAPP:${JID}` });
        mockPrisma.$queryRawUnsafe.mockResolvedValue([newRow]);
        mockPrisma.threads.upsert.mockResolvedValue({});

        await svc.ensureWhatsappThreadForContact(JID);

        const upsertArg = mockPrisma.threads.upsert.mock.calls[0][0];
        expect(upsertArg.where.session_id).toBe(`BAILEYS:WHATSAPP:${JID}`);
        expect(upsertArg.create).toMatchObject({
          thread_status: 'OPEN',
          attention_mode: 'HUMAN',
          object_type: 'WHATSAPP',
          metadata: expect.objectContaining({ openedFromAgenda: true }),
        });
      });

      it('registra evento THREAD_CREATED y notifica por websocket al crear', async () => {
        mockPrisma.meta_inbox_contacts.findUnique.mockResolvedValue({
          actor_external_id: JID,
        });
        mockPrisma.threads.findFirst.mockResolvedValue(null);
        const newRow = makeThreadRow({ sessionId: `BAILEYS:WHATSAPP:${JID}` });
        mockPrisma.$queryRawUnsafe.mockResolvedValue([newRow]);
        mockPrisma.threads.upsert.mockResolvedValue({});

        await svc.ensureWhatsappThreadForContact(JID);

        expect(mockThreadEvent.recordThreadEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'THREAD_CREATED',
            eventSource: 'HUMAN',
          }),
        );
        expect(
          mockWebsocket.notificarMetaInboxThreadUpsert,
        ).toHaveBeenCalledTimes(1);
      });

      it('lanza InternalServerErrorException si getThreadRow devuelve null tras upsert', async () => {
        mockPrisma.meta_inbox_contacts.findUnique.mockResolvedValue({
          actor_external_id: JID,
        });
        mockPrisma.threads.findFirst.mockResolvedValue(null);
        mockPrisma.$queryRawUnsafe.mockResolvedValue([]); // getThreadRow retorna null
        mockPrisma.threads.upsert.mockResolvedValue({});

        await expect(
          svc.ensureWhatsappThreadForContact(JID),
        ).rejects.toBeInstanceOf(InternalServerErrorException);
      });
    });
  });

  // ──────────────────────────────────────────────
  // getStageTemplatePaths()
  // ──────────────────────────────────────────────

  describe('getStageTemplatePaths()', () => {
    it('lanza BadRequestException cuando stageActual está vacío', async () => {
      await expect(svc.getStageTemplatePaths('')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('lanza BadRequestException cuando stageActual solo tiene espacios', async () => {
      await expect(svc.getStageTemplatePaths('   ')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('devuelve stage_actual y array de caminos', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          stageActual: 'inicio',
          posicion: 1,
          posiblesMatch: 'hola|hi',
          esFallback: false,
          procesaDatos: false,
          datoEsperado: null,
          modoDefault: null,
          factible: true,
          decision: 'continuar',
          accion: null,
          nuevoStage: 'menu',
          tipoRespuesta: 'texto',
          stageRoute: null,
        },
      ]);

      const result = await svc.getStageTemplatePaths('inicio');

      expect(result.stage_actual).toBe('inicio');
      expect(result.caminos).toHaveLength(1);
    });

    it('omite campos null, undefined y cadena vacía en los caminos', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          stageActual: 'inicio',
          posicion: null,
          posiblesMatch: 'hola',
          esFallback: false,
          procesaDatos: false,
          datoEsperado: null,
          modoDefault: '',
          factible: null,
          decision: null,
          accion: null,
          nuevoStage: 'menu',
          tipoRespuesta: 'texto',
          stageRoute: null,
        },
      ]);

      const result = await svc.getStageTemplatePaths('inicio');
      const camino = result.caminos[0] as Record<string, unknown>;

      expect(camino).not.toHaveProperty('posicion');
      expect(camino).not.toHaveProperty('dato_esperado');
      expect(camino).not.toHaveProperty('modo_default');
      expect(camino).not.toHaveProperty('decision');
      expect(camino).toHaveProperty('posibles_match', 'hola');
      expect(camino).toHaveProperty('nuevo_stage', 'menu');
    });

    it('devuelve array vacío de caminos cuando no hay templates para el stage', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      const result = await svc.getStageTemplatePaths('stage-inexistente');
      expect(result.caminos).toHaveLength(0);
    });

    it('normaliza stageActual con trim', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      await svc.getStageTemplatePaths('  inicio  ');
      const params = mockPrisma.$queryRawUnsafe.mock.calls[0];
      expect(params[1]).toBe('inicio');
    });
  });

  // ──────────────────────────────────────────────
  // updateThreadControl()
  // ──────────────────────────────────────────────

  describe('updateThreadControl()', () => {
    const before = makeSnapshot({
      threadStatus: 'OPEN',
      attentionMode: 'BOT',
      threadStage: 'inicio',
    });
    const after = makeSnapshot({
      threadStatus: 'CLOSED',
      attentionMode: 'HUMAN',
      threadStage: 'fin',
    });

    it('lanza NotFoundException cuando el thread no existe', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      await expect(
        svc.updateThreadControl('sess-ghost', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('devuelve ok:true con el estado actualizado', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([before])
        .mockResolvedValueOnce([after]);

      const result = await svc.updateThreadControl('sess-001', {
        threadStatus: 'CLOSED',
      });

      expect(result.ok).toBe(true);
      expect(result.threadStatus).toBe('CLOSED');
    });

    it('registra THREAD_STATUS_CHANGED solo cuando el status cambia', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([before])
        .mockResolvedValueOnce([after]);

      await svc.updateThreadControl('sess-001', { threadStatus: 'CLOSED' });

      const calls = mockThreadEvent.recordThreadEvent.mock.calls.map(
        (c) => c[0].eventType,
      );
      expect(calls).toContain('THREAD_STATUS_CHANGED');
    });

    it('NO registra THREAD_STATUS_CHANGED cuando el status no cambia', async () => {
      const sameStatus = makeSnapshot({ threadStatus: 'OPEN' });
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([sameStatus])
        .mockResolvedValueOnce([sameStatus]);

      await svc.updateThreadControl('sess-001', { threadStatus: 'OPEN' });

      const calls = mockThreadEvent.recordThreadEvent.mock.calls.map(
        (c) => c[0].eventType,
      );
      expect(calls).not.toContain('THREAD_STATUS_CHANGED');
    });

    it('registra ATTENTION_MODE_CHANGED solo cuando el modo cambia', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([before])
        .mockResolvedValueOnce([after]);

      await svc.updateThreadControl('sess-001', { attentionMode: 'HUMAN' });

      const calls = mockThreadEvent.recordThreadEvent.mock.calls.map(
        (c) => c[0].eventType,
      );
      expect(calls).toContain('ATTENTION_MODE_CHANGED');
    });

    it('registra THREAD_STAGE_CHANGED solo cuando el stage cambia', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([before])
        .mockResolvedValueOnce([after]);

      await svc.updateThreadControl('sess-001', { threadStage: 'fin' });

      const calls = mockThreadEvent.recordThreadEvent.mock.calls.map(
        (c) => c[0].eventType,
      );
      expect(calls).toContain('THREAD_STAGE_CHANGED');
    });

    it('NO registra ningún evento cuando ningún campo cambia', async () => {
      const snap = makeSnapshot({
        threadStatus: 'OPEN',
        attentionMode: 'BOT',
        threadStage: 'inicio',
      });
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([snap])
        .mockResolvedValueOnce([snap]);

      await svc.updateThreadControl('sess-001', {
        threadStatus: 'OPEN',
        attentionMode: 'BOT',
        threadStage: 'inicio',
      });

      expect(mockThreadEvent.recordThreadEvent).not.toHaveBeenCalled();
    });

    it('llama notifyThreadUpsert siempre que el thread existe', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([before])
        .mockResolvedValueOnce([after]);

      await svc.updateThreadControl('sess-001', {});

      expect(
        mockWebsocket.notificarMetaInboxThreadUpsert,
      ).toHaveBeenCalledTimes(1);
    });

    it('usa eventSource "HUMAN" por defecto', async () => {
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([before])
        .mockResolvedValueOnce([after]);

      await svc.updateThreadControl('sess-001', { attentionMode: 'HUMAN' });

      const eventCall = mockThreadEvent.recordThreadEvent.mock.calls[0]?.[0];
      if (eventCall) expect(eventCall.eventSource).toBe('HUMAN');
    });
  });

  // ──────────────────────────────────────────────
  // reopenThread()
  // ──────────────────────────────────────────────

  describe('reopenThread()', () => {
    it('lanza NotFoundException cuando el thread no existe', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      await expect(svc.reopenThread('sess-ghost')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lanza BadRequestException cuando el thread no está ARCHIVED', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        makeThreadRow({ threadStatus: 'OPEN' }),
      ]);
      await expect(svc.reopenThread('sess-001')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('lanza BadRequestException también cuando el thread está CLOSED', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        makeThreadRow({ threadStatus: 'CLOSED' }),
      ]);
      await expect(svc.reopenThread('sess-001')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('reabre thread ARCHIVED: ejecuta UPDATE y devuelve ThreadRow', async () => {
      const archived = makeThreadRow({ threadStatus: 'ARCHIVED' });
      const reopened = makeThreadRow({
        threadStatus: 'OPEN',
        attentionMode: 'HUMAN',
      });
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([archived])
        .mockResolvedValueOnce([reopened]);

      const result = await svc.reopenThread('sess-001');

      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(1);
      expect(result.threadStatus).toBe('OPEN');
    });

    it('registra evento THREAD_REOPENED con fromValue=ARCHIVED', async () => {
      const archived = makeThreadRow({ threadStatus: 'ARCHIVED' });
      const reopened = makeThreadRow({ threadStatus: 'OPEN' });
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([archived])
        .mockResolvedValueOnce([reopened]);

      await svc.reopenThread('sess-001');

      expect(mockThreadEvent.recordThreadEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'THREAD_REOPENED',
          fromValue: 'ARCHIVED',
          toValue: 'OPEN',
          eventSource: 'HUMAN',
        }),
      );
    });

    it('lanza InternalServerErrorException si getThreadRow falla tras UPDATE', async () => {
      const archived = makeThreadRow({ threadStatus: 'ARCHIVED' });
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([archived])
        .mockResolvedValueOnce([]); // getThreadRow retorna null después del UPDATE

      await expect(svc.reopenThread('sess-001')).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });
  });

  // ──────────────────────────────────────────────
  // resolveSessionIdForAutomation()
  // ──────────────────────────────────────────────

  describe('resolveSessionIdForAutomation()', () => {
    it('devuelve sessionId directamente cuando se proporciona y existe', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ sessionId: 'sess-001' }]);
      const result = await svc.resolveSessionIdForAutomation({
        sessionId: 'sess-001',
      });
      expect(result).toBe('sess-001');
    });

    it('lanza NotFoundException cuando el sessionId proporcionado no existe', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      await expect(
        svc.resolveSessionIdForAutomation({ sessionId: 'sess-ghost' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza BadRequestException cuando no hay sessionId ni actorExternalId+objectType', async () => {
      await expect(
        svc.resolveSessionIdForAutomation({}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza BadRequestException cuando solo hay actorExternalId sin objectType', async () => {
      await expect(
        svc.resolveSessionIdForAutomation({ actorExternalId: '56912345678' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('resuelve por actorExternalId+objectType cuando no hay sessionId', async () => {
      const row = makeThreadRow({ sessionId: 'sess-by-actor' });
      mockPrisma.$queryRawUnsafe.mockResolvedValue([row]);
      const result = await svc.resolveSessionIdForAutomation({
        actorExternalId: '56912345678@s.whatsapp.net',
        objectType: 'WHATSAPP',
      });
      expect(result).toBe('sess-by-actor');
    });

    it('lanza NotFoundException cuando no hay thread para actorExternalId+objectType', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      await expect(
        svc.resolveSessionIdForAutomation({
          actorExternalId: 'actor-ghost',
          objectType: 'WHATSAPP',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────
  // getThreadIdentity()
  // ──────────────────────────────────────────────

  describe('getThreadIdentity()', () => {
    it('devuelve identity desde threads cuando el thread existe', async () => {
      const identity = {
        sessionId: 'sess-001',
        actorExternalId: 'actor',
        objectType: 'WHATSAPP',
        sourceChannel: null,
      };
      mockPrisma.$queryRawUnsafe.mockResolvedValue([identity]);
      const result = await svc.getThreadIdentity('sess-001');
      expect(result).toEqual(identity);
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    });

    it('hace fallback a thread_messages cuando threads no tiene el session_id', async () => {
      const fallbackIdentity = {
        sessionId: 'sess-001',
        actorExternalId: 'actor',
        objectType: 'WHATSAPP',
        sourceChannel: null,
      };
      mockPrisma.$queryRawUnsafe
        .mockResolvedValueOnce([]) // sin fila en threads
        .mockResolvedValueOnce([fallbackIdentity]); // fila en thread_messages

      const result = await svc.getThreadIdentity('sess-001');

      expect(result).toEqual(fallbackIdentity);
      expect(mockPrisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);
    });

    it('devuelve null cuando no existe en threads ni en thread_messages', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      const result = await svc.getThreadIdentity('sess-ghost');
      expect(result).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // notifyThreadUpsert()
  // ──────────────────────────────────────────────

  describe('notifyThreadUpsert()', () => {
    it('llama a websocketNotifier con los campos correctos del snapshot', async () => {
      const snapshot = makeSnapshot({
        threadId: 'thread-id-x',
        sessionId: 'sess-x',
        lastMessageAt: new Date('2024-06-01T12:00:00Z'),
      });

      await svc.notifyThreadUpsert(snapshot);

      expect(mockWebsocket.notificarMetaInboxThreadUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId: 'thread-id-x',
          sessionId: 'sess-x',
          threadStatus: snapshot.threadStatus,
          attentionMode: snapshot.attentionMode,
        }),
      );
    });

    it('convierte lastMessageAt a ISO string antes de notificar', async () => {
      const snapshot = makeSnapshot({
        lastMessageAt: new Date('2024-06-01T12:00:00Z'),
      });
      await svc.notifyThreadUpsert(snapshot);
      const arg = mockWebsocket.notificarMetaInboxThreadUpsert.mock.calls[0][0];
      expect(arg.lastMessageAt).toBe('2024-06-01T12:00:00.000Z');
    });
  });

  // ──────────────────────────────────────────────
  // resolveThreadByActor()
  // ──────────────────────────────────────────────

  describe('resolveThreadByActor()', () => {
    it('devuelve ThreadRow cuando existe thread para el actor', async () => {
      const row = makeThreadRow();
      mockPrisma.$queryRawUnsafe.mockResolvedValue([row]);
      const result = await svc.resolveThreadByActor('actor', 'WHATSAPP');
      expect(result).toBe(row);
    });

    it('lanza NotFoundException cuando no hay thread para el actor', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([]);
      await expect(
        svc.resolveThreadByActor('actor-ghost', 'WHATSAPP'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
