import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MsgDelegationCompletionService } from './msg-delegation-completion.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ActorScoringService } from '../scoring/actor-scoring.service';
import { MsgDelegationStateService } from './msg-delegation-state.service';

const QUEUE_TOKEN = 'BullQueue_q_actor_transitions';

const mockTx = { $queryRaw: jest.fn() };

const mockPrisma = {
  $transaction: jest.fn((cb: (tx: any) => Promise<any>) => cb(mockTx)),
};

const mockScoring = {
  getLifecycleState: jest.fn(),
  applyDeltaIfNew: jest.fn(),
};

const mockState = {
  isDone: jest.fn(),
  ensurePending: jest.fn(),
  markCompleted: jest.fn(),
  markFailed: jest.fn(),
  getPending: jest.fn(),
};

const mockQueue = {
  add: jest.fn(),
};

async function buildService(): Promise<MsgDelegationCompletionService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      MsgDelegationCompletionService,
      { provide: PrismaService, useValue: mockPrisma },
      { provide: ActorScoringService, useValue: mockScoring },
      { provide: MsgDelegationStateService, useValue: mockState },
      { provide: QUEUE_TOKEN, useValue: mockQueue },
    ],
  }).compile();

  return module.get(MsgDelegationCompletionService);
}

describe('MsgDelegationCompletionService', () => {
  let svc: MsgDelegationCompletionService;

  beforeAll(async () => {
    svc = await buildService();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      (cb: (tx: any) => Promise<any>) => cb(mockTx),
    );
    mockState.ensurePending.mockResolvedValue(undefined);
    mockState.markCompleted.mockResolvedValue(undefined);
    mockState.markFailed.mockResolvedValue(undefined);
    mockQueue.add.mockResolvedValue({ id: 'job-1' });
  });

  // ──────────────────────────────────────────────
  // complete()
  // ──────────────────────────────────────────────

  describe('complete()', () => {
    const base = { externalEventId: 'evt-001', actorExternalId: 'actor-abc' };

    describe('idempotencia', () => {
      it('devuelve idempotent:true cuando el evento ya está procesado', async () => {
        mockState.isDone.mockResolvedValue(true);

        const result = await svc.complete(base);

        expect(result).toEqual({
          accepted: true,
          idempotent: true,
          reason: 'already_done',
        });
        expect(mockState.ensurePending).not.toHaveBeenCalled();
        expect(mockState.markCompleted).not.toHaveBeenCalled();
      });
    });

    describe('sin señal (hasSignal = false)', () => {
      it('marca completed con status no_signal y no encola transición', async () => {
        mockState.isDone.mockResolvedValue(false);

        const result = await svc.complete({ ...base, hasSignal: false });

        expect(result).toEqual({
          accepted: true,
          idempotent: false,
          transitionEnqueued: false,
          hasSignal: false,
        });
        expect(mockState.markCompleted).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({ status: 'no_signal' }),
          }),
        );
        expect(mockQueue.add).not.toHaveBeenCalled();
      });

      it('incluye metadata adicional en el registro cuando se proporciona', async () => {
        mockState.isDone.mockResolvedValue(false);

        await svc.complete({
          ...base,
          hasSignal: false,
          metadata: { origen: 'test' },
        });

        const callArg = mockState.markCompleted.mock.calls[0][0];
        expect(callArg.metadata).toMatchObject({
          status: 'no_signal',
          origen: 'test',
        });
      });
    });

    describe('con señal pero sin signalType', () => {
      it('lanza BadRequestException cuando hasSignal=true y no hay signalType', async () => {
        mockState.isDone.mockResolvedValue(false);

        await expect(
          svc.complete({ ...base, hasSignal: true }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(mockState.markCompleted).not.toHaveBeenCalled();
      });

      it('lanza BadRequestException también cuando hasSignal no se especifica (default true)', async () => {
        mockState.isDone.mockResolvedValue(false);

        // hasSignal no especificado → input.hasSignal !== false → true → requiere signalType
        await expect(svc.complete(base)).rejects.toBeInstanceOf(
          BadRequestException,
        );
      });
    });

    describe('con señal y actor terminal', () => {
      it('no encola transición cuando el actor está en estado terminal', async () => {
        mockState.isDone.mockResolvedValue(false);
        mockScoring.getLifecycleState.mockResolvedValue({ isTerminal: true });
        mockTx.$queryRaw.mockResolvedValue([{ delta: 10 }]);
        mockScoring.applyDeltaIfNew.mockResolvedValue(undefined);

        const result = await svc.complete({
          ...base,
          hasSignal: true,
          signalType: 'CERRAR',
        });

        expect(result).toEqual({
          accepted: true,
          idempotent: false,
          transitionEnqueued: false,
        });
        expect(mockQueue.add).not.toHaveBeenCalled();
        expect(mockState.markCompleted).toHaveBeenCalledTimes(1);
      });
    });

    describe('con señal y actor activo', () => {
      it('aplica delta de scoring y encola transición', async () => {
        mockState.isDone.mockResolvedValue(false);
        mockScoring.getLifecycleState.mockResolvedValue({ isTerminal: false });
        mockTx.$queryRaw.mockResolvedValue([{ delta: 5 }]);
        mockScoring.applyDeltaIfNew.mockResolvedValue(undefined);

        const result = await svc.complete({
          ...base,
          hasSignal: true,
          signalType: 'VENTA',
        });

        expect(result).toEqual({
          accepted: true,
          idempotent: false,
          transitionEnqueued: true,
        });
        expect(mockScoring.applyDeltaIfNew).toHaveBeenCalledWith(
          mockTx,
          expect.objectContaining({ delta: '5', signalType: 'VENTA' }),
        );
        expect(mockQueue.add).toHaveBeenCalledWith(
          'actor.transition.evaluate',
          expect.objectContaining({ actorExternalId: 'actor-abc' }),
          expect.objectContaining({ jobId: 'tr_evt-001' }),
        );
      });

      it('encola con jobId derivado del externalEventId', async () => {
        mockState.isDone.mockResolvedValue(false);
        mockScoring.getLifecycleState.mockResolvedValue({ isTerminal: false });
        mockTx.$queryRaw.mockResolvedValue([{ delta: 3 }]);
        mockScoring.applyDeltaIfNew.mockResolvedValue(undefined);

        await svc.complete({
          ...base,
          externalEventId: 'evt-XYZ',
          hasSignal: true,
          signalType: 'RENOVAR',
        });

        expect(mockQueue.add).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          expect.objectContaining({ jobId: 'tr_evt-XYZ' }),
        );
      });
    });
  });

  // ──────────────────────────────────────────────
  // resolveDeltaForSignal() — testado vía complete()
  // ──────────────────────────────────────────────

  describe('resolución de delta (vía complete con señal)', () => {
    const baseWithSignal = {
      externalEventId: 'evt-delta',
      actorExternalId: 'actor-abc',
      hasSignal: true as const,
      signalType: 'TEST_SIGNAL',
    };

    beforeEach(() => {
      mockState.isDone.mockResolvedValue(false);
      mockScoring.getLifecycleState.mockResolvedValue({ isTerminal: false });
      mockScoring.applyDeltaIfNew.mockResolvedValue(undefined);
    });

    it('usa delta numérico de la tabla signal_scoring_rules', async () => {
      mockTx.$queryRaw.mockResolvedValue([{ delta: 7 }]);

      await svc.complete(baseWithSignal);

      expect(mockScoring.applyDeltaIfNew).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({ delta: '7' }),
      );
    });

    it('usa delta "0" cuando no hay regla para el signalType', async () => {
      mockTx.$queryRaw.mockResolvedValue([]);

      await svc.complete(baseWithSignal);

      expect(mockScoring.applyDeltaIfNew).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({ delta: '0' }),
      );
    });

    it('usa delta "0" cuando la regla devuelve valor no finito', async () => {
      mockTx.$queryRaw.mockResolvedValue([{ delta: NaN }]);

      await svc.complete(baseWithSignal);

      expect(mockScoring.applyDeltaIfNew).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({ delta: '0' }),
      );
    });

    it('usa delta "0" como fallback cuando la consulta lanza excepción', async () => {
      mockTx.$queryRaw.mockRejectedValue(new Error('DB connection lost'));

      await svc.complete(baseWithSignal);

      // No debe lanzar, y debe aplicar delta = '0'
      expect(mockScoring.applyDeltaIfNew).toHaveBeenCalledWith(
        mockTx,
        expect.objectContaining({ delta: '0' }),
      );
    });
  });

  // ──────────────────────────────────────────────
  // completeWithoutSignal()
  // ──────────────────────────────────────────────

  describe('completeWithoutSignal()', () => {
    const base = {
      externalEventId: 'evt-timeout',
      actorExternalId: 'actor-abc',
      reason: 'timeout',
    };

    it('devuelve idempotent:true cuando el evento ya está procesado', async () => {
      mockState.isDone.mockResolvedValue(true);

      const result = await svc.completeWithoutSignal(base);

      expect(result).toEqual({
        accepted: true,
        idempotent: true,
        reason: 'already_done',
      });
      expect(mockState.markCompleted).not.toHaveBeenCalled();
    });

    it('devuelve pending_not_found cuando no hay estado pendiente', async () => {
      mockState.isDone.mockResolvedValue(false);
      mockState.getPending.mockResolvedValue(undefined);

      const result = await svc.completeWithoutSignal(base);

      expect(result).toEqual({
        accepted: true,
        idempotent: true,
        reason: 'pending_not_found',
      });
      expect(mockState.markCompleted).not.toHaveBeenCalled();
    });

    it('marca completed con no_signal y reason cuando hay pending', async () => {
      mockState.isDone.mockResolvedValue(false);
      mockState.getPending.mockResolvedValue({
        externalEventId: 'evt-timeout',
      });

      const result = await svc.completeWithoutSignal(base);

      expect(result).toEqual({
        accepted: true,
        idempotent: false,
        transitionEnqueued: false,
        hasSignal: false,
      });
      expect(mockState.markCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            status: 'no_signal',
            reason: 'timeout',
          }),
        }),
      );
    });
  });

  // ──────────────────────────────────────────────
  // fail()
  // ──────────────────────────────────────────────

  describe('fail()', () => {
    const base = { externalEventId: 'evt-fail', actorExternalId: 'actor-abc' };

    it('devuelve idempotent:true cuando el evento ya está procesado', async () => {
      mockState.isDone.mockResolvedValue(true);

      const result = await svc.fail(base);

      expect(result).toEqual({
        accepted: true,
        idempotent: true,
        reason: 'already_done',
      });
      expect(mockState.markFailed).not.toHaveBeenCalled();
    });

    it('llama a markFailed y markCompleted con status:failed', async () => {
      mockState.isDone.mockResolvedValue(false);

      const result = await svc.fail({ ...base, reason: 'timeout en n8n' });

      expect(result).toEqual({
        accepted: true,
        idempotent: false,
        transitionEnqueued: false,
      });
      expect(mockState.markFailed).toHaveBeenCalledWith(
        expect.objectContaining({
          externalEventId: 'evt-fail',
          reason: 'timeout en n8n',
        }),
      );
      expect(mockState.markCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            status: 'failed',
            reason: 'timeout en n8n',
          }),
        }),
      );
    });

    it('usa "unknown" como reason cuando no se proporciona', async () => {
      mockState.isDone.mockResolvedValue(false);

      await svc.fail(base);

      const callArg = mockState.markCompleted.mock.calls[0][0];
      expect(callArg.metadata.reason).toBe('unknown');
    });

    it('no encola ninguna transición al fallar', async () => {
      mockState.isDone.mockResolvedValue(false);

      await svc.fail(base);

      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // normalizeMetadata() — testada vía complete()
  // ──────────────────────────────────────────────

  describe('normalización de metadata (vía complete hasSignal=false)', () => {
    beforeEach(() => {
      mockState.isDone.mockResolvedValue(false);
    });

    const run = (metadata: unknown) =>
      svc.complete({
        externalEventId: 'evt-meta',
        actorExternalId: 'actor',
        hasSignal: false,
        metadata: metadata as any,
      });

    it('acepta objeto plano y lo incluye en metadata', async () => {
      await run({ clave: 'valor' });
      const callArg = mockState.markCompleted.mock.calls[0][0];
      expect(callArg.metadata).toMatchObject({ clave: 'valor' });
    });

    it('parsea string JSON válido como objeto', async () => {
      await run('{"origin":"test"}' as any);
      const callArg = mockState.markCompleted.mock.calls[0][0];
      expect(callArg.metadata).toMatchObject({ origin: 'test' });
    });

    it('envuelve string no-JSON en { raw }', async () => {
      await run('texto libre' as any);
      const callArg = mockState.markCompleted.mock.calls[0][0];
      expect(callArg.metadata).toMatchObject({ raw: 'texto libre' });
    });

    it('omite metadata cuando es undefined', async () => {
      await run(undefined);
      const callArg = mockState.markCompleted.mock.calls[0][0];
      // metadata solo debe tener status: no_signal (sin claves extra de normalización)
      expect(Object.keys(callArg.metadata)).toEqual(['status']);
    });
  });
});
