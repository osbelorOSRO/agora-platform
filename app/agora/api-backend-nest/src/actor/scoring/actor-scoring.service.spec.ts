import { ActorScoringService } from './actor-scoring.service';
import { PrismaService } from '../../database/prisma/prisma.service';

function buildTx(
  overrides: Partial<{
    findFirst: jest.Mock;
    create: jest.Mock;
    upsert: jest.Mock;
  }> = {},
) {
  return {
    actor_lifecycle: { findFirst: overrides.findFirst ?? jest.fn() },
    actor_history_score: {
      create: overrides.create ?? jest.fn().mockResolvedValue({}),
    },
    actor_score: {
      upsert: overrides.upsert ?? jest.fn().mockResolvedValue({}),
    },
  } as any;
}

function buildService() {
  return new ActorScoringService({} as PrismaService);
}

describe('ActorScoringService', () => {
  // ─── getLifecycleState ────────────────────────────────────────────────────

  describe('getLifecycleState', () => {
    it('devuelve state null e isTerminal false cuando no hay registro', async () => {
      const tx = buildTx({ findFirst: jest.fn().mockResolvedValue(null) });
      const svc = buildService();

      const result = await svc.getLifecycleState(tx, 'actor-1');

      expect(result.state).toBeNull();
      expect(result.isTerminal).toBe(false);
    });

    it('devuelve isTerminal true para estado QUALIFIED', async () => {
      const tx = buildTx({
        findFirst: jest.fn().mockResolvedValue({ state: 'QUALIFIED' }),
      });
      const svc = buildService();

      const result = await svc.getLifecycleState(tx, 'actor-1');

      expect(result.state).toBe('QUALIFIED');
      expect(result.isTerminal).toBe(true);
    });

    it('devuelve isTerminal true para estado BLOCKED', async () => {
      const tx = buildTx({
        findFirst: jest.fn().mockResolvedValue({ state: 'BLOCKED' }),
      });
      const svc = buildService();

      const result = await svc.getLifecycleState(tx, 'actor-1');

      expect(result.state).toBe('BLOCKED');
      expect(result.isTerminal).toBe(true);
    });

    it('devuelve isTerminal false para estado NEW', async () => {
      const tx = buildTx({
        findFirst: jest.fn().mockResolvedValue({ state: 'NEW' }),
      });
      const svc = buildService();

      const result = await svc.getLifecycleState(tx, 'actor-1');

      expect(result.state).toBe('NEW');
      expect(result.isTerminal).toBe(false);
    });

    it('devuelve isTerminal false para estado CHURNED', async () => {
      const tx = buildTx({
        findFirst: jest.fn().mockResolvedValue({ state: 'CHURNED' }),
      });
      const svc = buildService();

      const result = await svc.getLifecycleState(tx, 'actor-1');

      expect(result.state).toBe('CHURNED');
      expect(result.isTerminal).toBe(false);
    });

    it('consulta ordenando por occurred_at desc', async () => {
      const findFirst = jest.fn().mockResolvedValue(null);
      const tx = buildTx({ findFirst });
      const svc = buildService();

      await svc.getLifecycleState(tx, 'actor-abc');

      expect(findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { actor_external_id: 'actor-abc' },
          orderBy: { occurred_at: 'desc' },
        }),
      );
    });
  });

  // ─── applyDeltaIfNew ──────────────────────────────────────────────────────

  describe('applyDeltaIfNew', () => {
    const baseInput = {
      actorExternalId: 'actor-1',
      externalEventId: 'event-1',
      delta: '10',
      signalType: 'mensaje_entrante',
    };

    it('inserta delta nuevo y hace upsert del score', async () => {
      const create = jest.fn().mockResolvedValue({ id: 'uuid-1' });
      const upsert = jest.fn().mockResolvedValue({});
      const tx = buildTx({ create, upsert });
      const svc = buildService();

      const result = await svc.applyDeltaIfNew(tx, baseInput);

      expect(result).toEqual({ inserted: true });
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actor_external_id: 'actor-1',
            external_event_id: 'event-1',
            score_delta: '10',
            signal_type: 'mensaje_entrante',
          }),
        }),
      );
      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { actor_external_id: 'actor-1' },
        }),
      );
    });

    it('devuelve inserted false si el evento ya existe (P2002)', async () => {
      const p2002 = Object.assign(new Error('Unique constraint'), {
        code: 'P2002',
      });
      const create = jest.fn().mockRejectedValue(p2002);
      const upsert = jest.fn();
      const tx = buildTx({ create, upsert });
      const svc = buildService();

      const result = await svc.applyDeltaIfNew(tx, baseInput);

      expect(result).toEqual({ inserted: false });
      expect(upsert).not.toHaveBeenCalled();
    });

    it('propaga errores distintos de P2002', async () => {
      const dbError = Object.assign(new Error('Connection lost'), {
        code: 'P1001',
      });
      const create = jest.fn().mockRejectedValue(dbError);
      const tx = buildTx({ create });
      const svc = buildService();

      await expect(svc.applyDeltaIfNew(tx, baseInput)).rejects.toThrow(
        'Connection lost',
      );
    });

    it('incluye metadata en el insert cuando se proporciona', async () => {
      const create = jest.fn().mockResolvedValue({ id: 'uuid-2' });
      const tx = buildTx({ create, upsert: jest.fn().mockResolvedValue({}) });
      const svc = buildService();

      await svc.applyDeltaIfNew(tx, {
        ...baseInput,
        metadata: { source: 'test' },
      });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ metadata: { source: 'test' } }),
        }),
      );
    });
  });
});
