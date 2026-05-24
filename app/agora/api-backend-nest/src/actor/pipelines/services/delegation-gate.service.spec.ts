import { Test, TestingModule } from '@nestjs/testing';
import { DelegationGateService } from './delegation-gate.service';
import { MessageNormalizerService } from './message-normalizer.service';

describe('DelegationGateService', () => {
  let service: DelegationGateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DelegationGateService, MessageNormalizerService],
    }).compile();
    service = module.get<DelegationGateService>(DelegationGateService);
  });

  // --- isInboxMessageEvent ---

  describe('isInboxMessageEvent', () => {
    it.each(['message', 'postback', 'reaction', 'unsupported', 'message_echo'])(
      'returns true for "%s"',
      (eventType) => {
        expect(service.isInboxMessageEvent(eventType)).toBe(true);
      },
    );

    it('returns true when event has messaging. prefix', () => {
      expect(service.isInboxMessageEvent('messaging.message')).toBe(true);
    });

    it('returns false for message_reads', () => {
      expect(service.isInboxMessageEvent('message_reads')).toBe(false);
    });

    it('returns false for delivery event', () => {
      expect(service.isInboxMessageEvent('message_deliveries')).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(service.isInboxMessageEvent(undefined)).toBe(false);
    });
  });

  // --- isDelegableIncomingEvent ---

  describe('isDelegableIncomingEvent', () => {
    it('returns true for META incoming message', () => {
      expect(service.isDelegableIncomingEvent('META', 'message', 'INCOMING')).toBe(true);
    });

    it('returns true for BAILEYS incoming message', () => {
      expect(service.isDelegableIncomingEvent('BAILEYS', 'message', 'INCOMING')).toBe(true);
    });

    it('returns true regardless of provider casing', () => {
      expect(service.isDelegableIncomingEvent('meta', 'message', 'INCOMING')).toBe(true);
      expect(service.isDelegableIncomingEvent('baileys', 'message', 'INCOMING')).toBe(true);
    });

    it('returns false for OUTGOING direction', () => {
      expect(service.isDelegableIncomingEvent('META', 'message', 'OUTGOING')).toBe(false);
    });

    it('returns false for SYSTEM direction', () => {
      expect(service.isDelegableIncomingEvent('META', 'message', 'SYSTEM')).toBe(false);
    });

    it('returns false for postback (non-message event)', () => {
      expect(service.isDelegableIncomingEvent('META', 'postback', 'INCOMING')).toBe(false);
    });

    it('returns false for unknown provider', () => {
      expect(service.isDelegableIncomingEvent('UNKNOWN', 'message', 'INCOMING')).toBe(false);
    });

    it('defaults to META when provider is undefined (returns true for incoming message)', () => {
      // undefined || 'META' → treats as META provider, which is delegable
      expect(service.isDelegableIncomingEvent(undefined, 'message', 'INCOMING')).toBe(true);
    });
  });

  // --- getLatestLifecycleState ---

  describe('getLatestLifecycleState', () => {
    it('returns state from query result', async () => {
      const tx = { $queryRawUnsafe: jest.fn().mockResolvedValue([{ state: 'QUALIFIED' }]) };
      const result = await service.getLatestLifecycleState(tx, 'actor1');
      expect(result).toBe('QUALIFIED');
    });

    it('returns BLOCKED state correctly', async () => {
      const tx = { $queryRawUnsafe: jest.fn().mockResolvedValue([{ state: 'BLOCKED' }]) };
      const result = await service.getLatestLifecycleState(tx, 'actor1');
      expect(result).toBe('BLOCKED');
    });

    it('returns null when actor has no lifecycle rows', async () => {
      const tx = { $queryRawUnsafe: jest.fn().mockResolvedValue([]) };
      const result = await service.getLatestLifecycleState(tx, 'actor1');
      expect(result).toBeNull();
    });
  });

  // --- getDelegationControlState ---

  describe('getDelegationControlState', () => {
    const makeTx = (rows: unknown[]) => ({
      $queryRawUnsafe: jest.fn().mockResolvedValue(rows),
    });

    it('returns blocked=false when thread is OPEN with N8N attention mode', async () => {
      const tx = makeTx([{
        sessionId: 'sess1', threadStatus: 'OPEN', attentionMode: 'N8N',
        threadStage: 'inicio', awaitingFirstIncomingDelegate: false,
      }]);
      const result = await service.getDelegationControlState(tx, 'actor1', 'PAGE');
      expect(result.blocked).toBe(false);
      expect(result.sessionId).toBe('sess1');
    });

    it('blocks when threadStatus is PAUSED', async () => {
      const tx = makeTx([{
        sessionId: 'sess1', threadStatus: 'PAUSED', attentionMode: 'N8N',
        threadStage: 'inicio', awaitingFirstIncomingDelegate: false,
      }]);
      const result = await service.getDelegationControlState(tx, 'actor1', 'PAGE');
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('thread_status_paused');
    });

    it('blocks when threadStatus is CLOSED', async () => {
      const tx = makeTx([{
        sessionId: 'sess1', threadStatus: 'CLOSED', attentionMode: 'N8N',
        threadStage: 'fin', awaitingFirstIncomingDelegate: false,
      }]);
      const result = await service.getDelegationControlState(tx, 'actor1', 'PAGE');
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('thread_status_closed');
    });

    it('blocks when attentionMode is HUMAN', async () => {
      const tx = makeTx([{
        sessionId: 'sess1', threadStatus: 'OPEN', attentionMode: 'HUMAN',
        threadStage: 'delegado_humano', awaitingFirstIncomingDelegate: false,
      }]);
      const result = await service.getDelegationControlState(tx, 'actor1', 'PAGE');
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('attention_mode_human');
    });

    it('blocks when attentionMode is SYSTEM', async () => {
      const tx = makeTx([{
        sessionId: 'sess1', threadStatus: 'OPEN', attentionMode: 'SYSTEM',
        threadStage: 'inicio', awaitingFirstIncomingDelegate: false,
      }]);
      const result = await service.getDelegationControlState(tx, 'actor1', 'PAGE');
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('attention_mode_system');
    });

    it('blocks when awaitingFirstIncomingDelegate is true (takes priority)', async () => {
      const tx = makeTx([{
        sessionId: 'sess1', threadStatus: 'OPEN', attentionMode: 'N8N',
        threadStage: 'inicio', awaitingFirstIncomingDelegate: true,
      }]);
      const result = await service.getDelegationControlState(tx, 'actor1', 'PAGE');
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe('awaiting_first_incoming_delegate');
    });

    it('returns blocked=false and null sessionId when no thread exists', async () => {
      const tx = makeTx([]);
      const result = await service.getDelegationControlState(tx, 'actor1', 'PAGE');
      expect(result.blocked).toBe(false);
      expect(result.sessionId).toBeNull();
      expect(result.threadStatus).toBeNull();
    });

    it('preserves threadStage in the result', async () => {
      const tx = makeTx([{
        sessionId: 'sess1', threadStatus: 'OPEN', attentionMode: 'N8N',
        threadStage: 'oferta_alta', awaitingFirstIncomingDelegate: false,
      }]);
      const result = await service.getDelegationControlState(tx, 'actor1', 'WHATSAPP');
      expect(result.threadStage).toBe('oferta_alta');
    });
  });

  // --- clearAwaitingFirstIncomingDelegate ---

  describe('clearAwaitingFirstIncomingDelegate', () => {
    it('calls $executeRawUnsafe with the correct sessionId', async () => {
      const tx = { $executeRawUnsafe: jest.fn().mockResolvedValue(undefined) };
      await service.clearAwaitingFirstIncomingDelegate(tx, 'sess-abc');
      expect(tx.$executeRawUnsafe).toHaveBeenCalledTimes(1);
      expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(expect.any(String), 'sess-abc');
    });
  });

  // --- buildThreadDelegationPayload ---

  describe('buildThreadDelegationPayload', () => {
    it('builds payload with thread data when thread exists', async () => {
      const threadRow = {
        threadId: 'tid1', sessionId: 'sess1', actorExternalId: 'actor1',
        objectType: 'PAGE', sourceChannel: null, threadStatus: 'OPEN',
        attentionMode: 'N8N', threadStage: 'inicio',
        displayName: 'Test', phone: null, email: null, notes: null, city: null,
        actorScore: null, actorLifecycleState: null, actorLifecycleUpdatedAt: null,
      };
      const tx = { $queryRawUnsafe: jest.fn().mockResolvedValue([threadRow]) };
      const env = {
        externalEventId: 'evt1',
        actorExternalId: 'actor1',
        occurredAt: new Date().toISOString(),
        provider: 'META',
        objectType: 'PAGE',
        eventType: 'message',
        payload: { message: { text: 'Hola', mid: 'mid1' } },
      };
      const delegationControl = { sessionId: 'sess1', threadStatus: 'OPEN', attentionMode: 'N8N', threadStage: 'inicio' };

      const result = await service.buildThreadDelegationPayload(tx, env, delegationControl);

      expect(result.sessionId).toBe('sess1');
      expect(result.externalEventId).toBe('evt1');
      expect(result.thread).toMatchObject({ sessionId: 'sess1', actorExternalId: 'actor1' });
      const msg = result.message as Record<string, unknown>;
      expect(msg).toMatchObject({ eventKind: 'message' });
      expect(['INCOMING', 'OUTGOING', 'SYSTEM']).toContain(msg['direction']);
    });

    it('returns null thread when no thread row found', async () => {
      const tx = { $queryRawUnsafe: jest.fn().mockResolvedValue([]) };
      const env = {
        externalEventId: 'evt2', actorExternalId: 'actor2',
        occurredAt: new Date().toISOString(), provider: 'META', objectType: 'PAGE',
        eventType: 'message', payload: {},
      };
      const delegationControl = { sessionId: 'sess2', threadStatus: null, attentionMode: null, threadStage: null };

      const result = await service.buildThreadDelegationPayload(tx, env, delegationControl);

      expect(result.thread).toBeNull();
      expect(result.contact).toBeNull();
    });
  });

  // --- static constants ---

  describe('static constants', () => {
    it('DELEGATION_BLOCKING_ATTENTION_MODES includes HUMAN, SYSTEM, PAUSED', () => {
      expect(DelegationGateService.DELEGATION_BLOCKING_ATTENTION_MODES.has('HUMAN')).toBe(true);
      expect(DelegationGateService.DELEGATION_BLOCKING_ATTENTION_MODES.has('SYSTEM')).toBe(true);
      expect(DelegationGateService.DELEGATION_BLOCKING_ATTENTION_MODES.has('PAUSED')).toBe(true);
      expect(DelegationGateService.DELEGATION_BLOCKING_ATTENTION_MODES.has('N8N')).toBe(false);
    });

    it('DELEGATION_BLOCKING_THREAD_STATUSES includes PAUSED and CLOSED', () => {
      expect(DelegationGateService.DELEGATION_BLOCKING_THREAD_STATUSES.has('PAUSED')).toBe(true);
      expect(DelegationGateService.DELEGATION_BLOCKING_THREAD_STATUSES.has('CLOSED')).toBe(true);
      expect(DelegationGateService.DELEGATION_BLOCKING_THREAD_STATUSES.has('OPEN')).toBe(false);
    });
  });
});
