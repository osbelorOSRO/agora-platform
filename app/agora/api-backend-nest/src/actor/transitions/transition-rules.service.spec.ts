import { TransitionRulesService } from './transition-rules.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ActorLifecycleState, ScoreOperator } from '../actor.types';

function buildTx(rules: any[]) {
  return { $queryRaw: jest.fn().mockResolvedValue(rules) } as any;
}

function buildService() {
  return new TransitionRulesService({} as PrismaService);
}

describe('TransitionRulesService', () => {
  describe('resolveNextState', () => {
    it('devuelve null cuando no hay reglas activas', async () => {
      const svc = buildService();
      const result = await svc.resolveNextState(
        buildTx([]),
        50,
        ActorLifecycleState.NEW,
      );
      expect(result).toBeNull();
    });

    it('devuelve el target_state de la primera regla que aplica', async () => {
      const rules = [
        {
          target_state: 'QUALIFIED',
          score_operator: 'gte',
          score_threshold: '80',
          required_current_state: null,
        },
      ];
      const svc = buildService();
      const result = await svc.resolveNextState(
        buildTx(rules),
        90,
        ActorLifecycleState.NEW,
      );
      expect(result).toBe('QUALIFIED');
    });

    it('salta regla si required_current_state no coincide', async () => {
      const rules = [
        {
          target_state: 'BLOCKED',
          score_operator: null,
          score_threshold: null,
          required_current_state: 'CHURNED',
        },
        {
          target_state: 'QUALIFIED',
          score_operator: 'gte',
          score_threshold: '80',
          required_current_state: null,
        },
      ];
      const svc = buildService();
      const result = await svc.resolveNextState(
        buildTx(rules),
        90,
        ActorLifecycleState.NEW,
      );
      expect(result).toBe('QUALIFIED');
    });

    it('aplica regla sin score_operator cuando required_current_state coincide', async () => {
      const rules = [
        {
          target_state: 'CHURNED',
          score_operator: null,
          score_threshold: null,
          required_current_state: 'NEW',
        },
      ];
      const svc = buildService();
      const result = await svc.resolveNextState(
        buildTx(rules),
        0,
        ActorLifecycleState.NEW,
      );
      expect(result).toBe('CHURNED');
    });

    it('evalúa operador LT correctamente', async () => {
      const svc = buildService();
      const rules = [
        {
          target_state: 'CHURNED',
          score_operator: ScoreOperator.LT,
          score_threshold: '10',
          required_current_state: null,
        },
      ];
      expect(
        await svc.resolveNextState(buildTx(rules), 5, ActorLifecycleState.NEW),
      ).toBe('CHURNED');
      expect(
        await svc.resolveNextState(buildTx(rules), 10, ActorLifecycleState.NEW),
      ).toBeNull();
      expect(
        await svc.resolveNextState(buildTx(rules), 15, ActorLifecycleState.NEW),
      ).toBeNull();
    });

    it('evalúa operador LTE correctamente', async () => {
      const svc = buildService();
      const rules = [
        {
          target_state: 'CHURNED',
          score_operator: ScoreOperator.LTE,
          score_threshold: '10',
          required_current_state: null,
        },
      ];
      expect(
        await svc.resolveNextState(buildTx(rules), 10, ActorLifecycleState.NEW),
      ).toBe('CHURNED');
      expect(
        await svc.resolveNextState(buildTx(rules), 11, ActorLifecycleState.NEW),
      ).toBeNull();
    });

    it('evalúa operador GT correctamente', async () => {
      const svc = buildService();
      const rules = [
        {
          target_state: 'QUALIFIED',
          score_operator: ScoreOperator.GT,
          score_threshold: '80',
          required_current_state: null,
        },
      ];
      expect(
        await svc.resolveNextState(buildTx(rules), 81, ActorLifecycleState.NEW),
      ).toBe('QUALIFIED');
      expect(
        await svc.resolveNextState(buildTx(rules), 80, ActorLifecycleState.NEW),
      ).toBeNull();
    });

    it('evalúa operador GTE correctamente', async () => {
      const svc = buildService();
      const rules = [
        {
          target_state: 'QUALIFIED',
          score_operator: ScoreOperator.GTE,
          score_threshold: '80',
          required_current_state: null,
        },
      ];
      expect(
        await svc.resolveNextState(buildTx(rules), 80, ActorLifecycleState.NEW),
      ).toBe('QUALIFIED');
      expect(
        await svc.resolveNextState(buildTx(rules), 79, ActorLifecycleState.NEW),
      ).toBeNull();
    });

    it('evalúa operador EQ correctamente', async () => {
      const svc = buildService();
      const rules = [
        {
          target_state: 'BLOCKED',
          score_operator: ScoreOperator.EQ,
          score_threshold: '0',
          required_current_state: null,
        },
      ];
      expect(
        await svc.resolveNextState(buildTx(rules), 0, ActorLifecycleState.NEW),
      ).toBe('BLOCKED');
      expect(
        await svc.resolveNextState(buildTx(rules), 1, ActorLifecycleState.NEW),
      ).toBeNull();
    });

    it('aplica la primera regla que coincide respetando el orden de prioridad', async () => {
      const rules = [
        {
          target_state: 'QUALIFIED',
          score_operator: ScoreOperator.GTE,
          score_threshold: '50',
          required_current_state: null,
        },
        {
          target_state: 'BLOCKED',
          score_operator: ScoreOperator.GTE,
          score_threshold: '50',
          required_current_state: null,
        },
      ];
      const svc = buildService();
      const result = await svc.resolveNextState(
        buildTx(rules),
        60,
        ActorLifecycleState.NEW,
      );
      expect(result).toBe('QUALIFIED');
    });
  });
});
