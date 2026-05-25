import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTransitionRules() {
    return this.prisma.lifecycle_transition_rules.findMany({
      orderBy: { priority: 'asc' },
      select: {
        id: true,
        target_state: true,
        score_operator: true,
        score_threshold: true,
        required_current_state: true,
        priority: true,
        is_active: true,
        description: true,
      },
    });
  }

  async updateTransitionThreshold(id: string, score_threshold: number) {
    const rule = await this.prisma.lifecycle_transition_rules.findUnique({
      where: { id },
    });
    if (!rule) throw new NotFoundException(`transition_rule_not_found:${id}`);

    return this.prisma.lifecycle_transition_rules.update({
      where: { id },
      data: { score_threshold },
      select: {
        id: true,
        target_state: true,
        score_operator: true,
        score_threshold: true,
        required_current_state: true,
        priority: true,
        is_active: true,
        description: true,
      },
    });
  }

  async listSignalScoringRules() {
    return this.prisma.signal_scoring_rules.findMany({
      orderBy: { signal_type: 'asc' },
      select: {
        id: true,
        signal_type: true,
        polarity: true,
        delta: true,
        is_active: true,
        description: true,
      },
    });
  }

  async updateSignalDelta(id: string, delta: number) {
    const rule = await this.prisma.signal_scoring_rules.findUnique({
      where: { id },
    });
    if (!rule)
      throw new NotFoundException(`signal_scoring_rule_not_found:${id}`);

    return this.prisma.signal_scoring_rules.update({
      where: { id },
      data: { delta },
      select: {
        id: true,
        signal_type: true,
        polarity: true,
        delta: true,
        is_active: true,
        description: true,
      },
    });
  }
}
