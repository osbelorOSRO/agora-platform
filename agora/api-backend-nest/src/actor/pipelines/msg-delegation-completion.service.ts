import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ActorScoringService } from '../scoring/actor-scoring.service';
import { Q_ACTOR_TRANSITIONS } from '../../queues/queues.constants';
import { MsgDelegationStateService } from './msg-delegation-state.service';

@Injectable()
export class MsgDelegationCompletionService {
  private readonly logger = new Logger(MsgDelegationCompletionService.name);

  private normalizeMetadata(value: any): Record<string, any> | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'object' && !Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      } catch {
        // ignore parse errors
      }
      return { raw: value };
    }
    return { value };
  }

  private async resolveDeltaForSignal(tx: PrismaService, signalType: string): Promise<string> {
    try {
      const rows = await tx.$queryRaw<Array<{ delta: unknown }>>`
        select delta
        from signal_scoring_rules
        where signal_type = ${signalType}
          and is_active = true
        limit 1
      `;

      if (!rows.length) {
        this.logger.warn(`FLOW[SCORING] rule_not_found signalType=${signalType}, fallback_delta=0`);
        return '0';
      }

      const raw = rows[0].delta;
      const value = typeof raw === 'number' ? raw : Number(raw);

      if (!Number.isFinite(value)) {
        this.logger.warn(`FLOW[SCORING] invalid_delta signalType=${signalType}, raw=${String(raw)}, fallback_delta=0`);
        return '0';
      }

      return value.toString();
    } catch (e: any) {
      this.logger.warn(
        `FLOW[SCORING] rule_lookup_error signalType=${signalType}, fallback_delta=0, error=${e?.message || e}`,
      );
      return '0';
    }
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ActorScoringService,
    private readonly state: MsgDelegationStateService,
    @InjectQueue(Q_ACTOR_TRANSITIONS) private readonly transitionsQueue: Queue,
  ) {}

  async complete(input: {
    externalEventId: string;
    actorExternalId: string;
    hasSignal?: boolean;
    signalType?: string;
    metadata?: any;
  }) {
    const alreadyDone = await this.state.isDone(input.externalEventId);
    if (alreadyDone) {
      this.logger.log(`FLOW[CALLBACK] complete idempotent externalEventId=${input.externalEventId}`);
      return { accepted: true, idempotent: true, reason: 'already_done' };
    }

    await this.state.ensurePending(input.externalEventId);
    const metadata = this.normalizeMetadata(input.metadata);
    const hasSignal = input.hasSignal !== false;
    this.logger.log(
      `FLOW[CALLBACK] complete evaluating externalEventId=${input.externalEventId}, hasSignal=${hasSignal}`,
    );

    if (!hasSignal) {
      await this.state.markCompleted({
        externalEventId: input.externalEventId,
        actorExternalId: input.actorExternalId,
        metadata: {
          status: 'no_signal',
          ...(metadata || {}),
        },
      });

      this.logger.log(`FLOW[CALLBACK] complete closed_no_signal externalEventId=${input.externalEventId}`);
      return { accepted: true, idempotent: false, transitionEnqueued: false, hasSignal: false };
    }

    if (!input.signalType) {
      throw new Error(`signalType is required when hasSignal=true externalEventId=${input.externalEventId}`);
    }

    const shouldEnqueueTransition = await this.prisma.$transaction(async (tx) => {
      const { isTerminal } = await this.scoring.getLifecycleState(tx as any, input.actorExternalId);
      if (isTerminal) return false;

      const resolvedDelta = await this.resolveDeltaForSignal(tx as any, input.signalType!);

      await this.scoring.applyDeltaIfNew(tx as any, {
        actorExternalId: input.actorExternalId,
        externalEventId: input.externalEventId,
        delta: resolvedDelta,
        signalType: input.signalType,
        metadata: {
          ...(metadata ?? { source: 'n8n.callback' }),
          resolvedDelta,
          scoringRuleSource: 'signal_scoring_rules',
        },
      });

      return true;
    });

    await this.state.markCompleted({
      externalEventId: input.externalEventId,
      actorExternalId: input.actorExternalId,
      metadata: { signalType: input.signalType, hasSignal: true },
    });
    this.logger.log(
      `FLOW[CALLBACK] complete closed_with_signal externalEventId=${input.externalEventId}, signalType=${input.signalType}`,
    );

    if (!shouldEnqueueTransition) return { accepted: true, idempotent: false, transitionEnqueued: false };

    await this.transitionsQueue.add(
      'actor.transition.evaluate',
      { actorExternalId: input.actorExternalId, triggerExternalEventId: input.externalEventId },
      { jobId: `tr_${input.externalEventId}` },
    );
    this.logger.log(`FLOW[CALLBACK] complete transition_enqueued externalEventId=${input.externalEventId}`);

    return { accepted: true, idempotent: false, transitionEnqueued: true };
  }

  async completeWithoutSignal(input: {
    externalEventId: string;
    actorExternalId: string;
    reason: string;
    metadata?: any;
  }) {
    const metadata = this.normalizeMetadata(input.metadata);

    const alreadyDone = await this.state.isDone(input.externalEventId);
    if (alreadyDone) {
      this.logger.log(`FLOW[TIMEOUT] idempotent externalEventId=${input.externalEventId}`);
      return { accepted: true, idempotent: true, reason: 'already_done' };
    }

    const pending = await this.state.getPending(input.externalEventId);
    if (!pending) {
      this.logger.warn(`FLOW[TIMEOUT] pending_not_found externalEventId=${input.externalEventId}`);
      return { accepted: true, idempotent: true, reason: 'pending_not_found' };
    }

    await this.state.markCompleted({
      externalEventId: input.externalEventId,
      actorExternalId: input.actorExternalId,
      metadata: {
        status: 'no_signal',
        reason: input.reason,
        ...(metadata || {}),
      },
    });
    this.logger.warn(`FLOW[TIMEOUT] closed_no_signal externalEventId=${input.externalEventId}`);

    return { accepted: true, idempotent: false, transitionEnqueued: false, hasSignal: false };
  }

  async fail(input: {
    externalEventId: string;
    actorExternalId: string;
    reason?: string;
    metadata?: any;
  }) {
    const metadata = this.normalizeMetadata(input.metadata);

    const alreadyDone = await this.state.isDone(input.externalEventId);
    if (alreadyDone) {
      this.logger.log(`FLOW[CALLBACK] fail idempotent externalEventId=${input.externalEventId}`);
      return { accepted: true, idempotent: true, reason: 'already_done' };
    }

    await this.state.markFailed({
      externalEventId: input.externalEventId,
      actorExternalId: input.actorExternalId,
      reason: input.reason,
    });

    await this.state.markCompleted({
      externalEventId: input.externalEventId,
      actorExternalId: input.actorExternalId,
      metadata: {
        status: 'failed',
        reason: input.reason || 'unknown',
        ...(metadata || {}),
      },
    });
    this.logger.warn(
      `FLOW[CALLBACK] fail closed externalEventId=${input.externalEventId}, reason=${input.reason || 'unknown'}`,
    );

    return { accepted: true, idempotent: false, transitionEnqueued: false };
  }
}
