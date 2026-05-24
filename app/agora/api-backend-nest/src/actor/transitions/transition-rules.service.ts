import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ActorLifecycleState, ScoreOperator } from '../actor.types';

type TransitionRuleRow = {
  target_state: ActorLifecycleState;
  score_operator: ScoreOperator | null;
  score_threshold: unknown;
  required_current_state: ActorLifecycleState | null;
};

@Injectable()
export class TransitionRulesService {
  private readonly logger = new Logger(TransitionRulesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolveNextState(
    tx: PrismaService,
    score: number,
    currentState: ActorLifecycleState,
  ): Promise<ActorLifecycleState | null> {
    const rules = await tx.$queryRaw<TransitionRuleRow[]>`
      SELECT target_state, score_operator, score_threshold, required_current_state
      FROM lifecycle_transition_rules
      WHERE is_active = true
      ORDER BY priority ASC
    `;

    for (const rule of rules) {
      if (rule.required_current_state && rule.required_current_state !== currentState) {
        continue;
      }

      if (rule.score_operator !== null && rule.score_threshold !== null) {
        const threshold = Number(rule.score_threshold);
        if (!this.scoreMatches(score, rule.score_operator, threshold)) continue;
      }

      return rule.target_state;
    }

    this.logger.log(`FLOW[TRANSITION] no_rule_matched score=${score} currentState=${currentState}`);
    return null;
  }

  private scoreMatches(score: number, operator: ScoreOperator, threshold: number): boolean {
    switch (operator) {
      case ScoreOperator.LT:  return score < threshold;
      case ScoreOperator.LTE: return score <= threshold;
      case ScoreOperator.GT:  return score > threshold;
      case ScoreOperator.GTE: return score >= threshold;
      case ScoreOperator.EQ:  return score === threshold;
    }
  }
}
