import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Q_ACTOR_TRANSITIONS } from '../../queues/queues.constants';
import { TransitionRulesService } from './transition-rules.service';
import { ActorLifecycleState } from '../actor.types';

@Processor(Q_ACTOR_TRANSITIONS, { concurrency: 1 })
export class ActorTransitionsProcessor extends WorkerHost {
  private readonly logger = new Logger(ActorTransitionsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transitionRules: TransitionRulesService,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<void> {
    const { actorExternalId, triggerExternalEventId } = job.data;
    this.logger.log(
      `FLOW[TRANSITION] start actorExternalId=${actorExternalId}, triggerExternalEventId=${triggerExternalEventId || 'n/a'}`,
    );

    await this.prisma.$transaction(async (tx) => {
      const last = await tx.actor_lifecycle.findFirst({
        where: { actor_external_id: actorExternalId },
        orderBy: { occurred_at: 'desc' },
        select: { state: true },
      });

      if (!last) {
        this.logger.warn(`FLOW[TRANSITION] actor without lifecycle actorExternalId=${actorExternalId}`);
        return;
      }

      const currentState = last.state as ActorLifecycleState;

      if (currentState === ActorLifecycleState.QUALIFIED || currentState === ActorLifecycleState.BLOCKED) {
        this.logger.log(`FLOW[TRANSITION] already terminal actorExternalId=${actorExternalId}`);
        return;
      }

      const scoreRow = await tx.actor_score.findUnique({
        where: { actor_external_id: actorExternalId },
        select: { score: true },
      });

      const score = Number(scoreRow?.score ?? 0);

      const nextState = await this.transitionRules.resolveNextState(tx as any, score, currentState);

      if (!nextState) {
        this.logger.log(`FLOW[TRANSITION] no transition actorExternalId=${actorExternalId}`);
        return;
      }
      if (nextState === currentState) {
        this.logger.log(`FLOW[TRANSITION] unchanged state=${currentState} actorExternalId=${actorExternalId}`);
        return;
      }

      await tx.actor_lifecycle.create({
        data: {
          actor_external_id: actorExternalId,
          state: nextState,
        },
      });
      this.logger.log(
        `FLOW[TRANSITION] transitioned actorExternalId=${actorExternalId}, from=${currentState}, to=${nextState}`,
      );
    });
  }
}
