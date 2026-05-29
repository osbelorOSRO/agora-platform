import { NotFoundException } from '@nestjs/common';
import { SettingsService } from './settings.service';

const mockPrisma = () => ({
  lifecycle_transition_rules: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  signal_scoring_rules: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
});

const transitionRule = (overrides = {}) => ({
  id: 'rule-1',
  target_state: 'ACTIVE',
  score_operator: 'gte',
  score_threshold: 50,
  required_current_state: null,
  priority: 1,
  is_active: true,
  description: 'Regla test',
  ...overrides,
});

const signalRule = (overrides = {}) => ({
  id: 'sig-1',
  signal_type: 'MESSAGE_SENT',
  polarity: 'positive',
  delta: 5,
  is_active: true,
  description: 'Señal test',
  ...overrides,
});

describe('SettingsService', () => {
  describe('listTransitionRules', () => {
    it('devuelve lista de reglas', async () => {
      const prisma = mockPrisma();
      prisma.lifecycle_transition_rules.findMany.mockResolvedValue([
        transitionRule(),
      ]);
      const svc = new SettingsService(prisma as any);
      const result = await svc.listTransitionRules();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rule-1');
    });
  });

  describe('updateTransitionThreshold', () => {
    it('lanza NotFoundException si la regla no existe', async () => {
      const prisma = mockPrisma();
      prisma.lifecycle_transition_rules.findUnique.mockResolvedValue(null);
      const svc = new SettingsService(prisma as any);
      await expect(
        svc.updateTransitionThreshold('no-existe', 80),
      ).rejects.toThrow(NotFoundException);
    });

    it('actualiza y devuelve la regla', async () => {
      const prisma = mockPrisma();
      prisma.lifecycle_transition_rules.findUnique.mockResolvedValue(
        transitionRule(),
      );
      prisma.lifecycle_transition_rules.update.mockResolvedValue(
        transitionRule({ score_threshold: 80 }),
      );
      const svc = new SettingsService(prisma as any);
      const result = await svc.updateTransitionThreshold('rule-1', 80);
      expect(result.score_threshold).toBe(80);
    });
  });

  describe('listSignalScoringRules', () => {
    it('devuelve lista de señales', async () => {
      const prisma = mockPrisma();
      prisma.signal_scoring_rules.findMany.mockResolvedValue([signalRule()]);
      const svc = new SettingsService(prisma as any);
      const result = await svc.listSignalScoringRules();
      expect(result).toHaveLength(1);
      expect(result[0].signal_type).toBe('MESSAGE_SENT');
    });
  });

  describe('updateSignalDelta', () => {
    it('lanza NotFoundException si la señal no existe', async () => {
      const prisma = mockPrisma();
      prisma.signal_scoring_rules.findUnique.mockResolvedValue(null);
      const svc = new SettingsService(prisma as any);
      await expect(svc.updateSignalDelta('no-existe', 10)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('actualiza el delta y devuelve la señal', async () => {
      const prisma = mockPrisma();
      prisma.signal_scoring_rules.findUnique.mockResolvedValue(signalRule());
      prisma.signal_scoring_rules.update.mockResolvedValue(
        signalRule({ delta: 10 }),
      );
      const svc = new SettingsService(prisma as any);
      const result = await svc.updateSignalDelta('sig-1', 10);
      expect(result.delta).toBe(10);
    });
  });
});
