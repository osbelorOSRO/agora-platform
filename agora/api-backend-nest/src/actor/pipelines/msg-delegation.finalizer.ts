import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { QueueEvents } from 'bullmq';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ActorScoringService } from '../scoring/actor-scoring.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Q_ACTOR_TRANSITIONS, Q_MSG_DELEGATION } from '../../queues/queues.constants';
import { MsgDelegationStateService } from './msg-delegation-state.service';

@Injectable()
export class MsgDelegationFinalizer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MsgDelegationFinalizer.name);
  private queueEvents?: QueueEvents;

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ActorScoringService,
    private readonly state: MsgDelegationStateService,
    @InjectQueue(Q_MSG_DELEGATION) private readonly delegationQueue: Queue,
    @InjectQueue(Q_ACTOR_TRANSITIONS) private readonly transitionsQueue: Queue,
  ) {}

  async onModuleInit() {
    // Escucha eventos del queue (completed/failed)
    this.queueEvents = new QueueEvents(Q_MSG_DELEGATION, {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    });

    this.queueEvents.on('completed', async ({ jobId }) => {
      try {
        await this.finalizeCompleted(jobId);
      } catch (e: any) {
        this.logger.error(`finalizeCompleted failed jobId=${jobId}`, e?.stack || e);
      }
    });

    this.queueEvents.on('failed', async ({ jobId, failedReason }) => {
      try {
        await this.finalizeFailed(jobId, failedReason);
      } catch (e: any) {
        this.logger.error(`finalizeFailed failed jobId=${jobId}`, e?.stack || e);
      }
    });

    await this.queueEvents.waitUntilReady();
    this.logger.log(`QueueEvents ready for ${Q_MSG_DELEGATION}`);
  }

  async onModuleDestroy() {
    await this.queueEvents?.close().catch(() => undefined);
  }

  private async finalizeCompleted(jobId: string) {
    const job = await this.delegationQueue.getJob(jobId);
    if (!job) return;

    const rv: any = job.returnvalue || {};
    const data: any = job.data;
    const actorExternalId = data.actorExternalId;
    const externalEventId = data.externalEventId;

    // Async mode: completion happens via callback endpoint, not via this queue completion.
    if (rv?.pending === true || rv?.status === 'accepted') {
      const alreadyDone = await this.state.isDone(externalEventId);
      if (alreadyDone) {
        this.logger.log(
          `FLOW[DELEGATION] callback already closed externalEventId=${externalEventId}, skipping pending`,
        );
        return;
      }

      this.logger.log(`FLOW[DELEGATION] pending externalEventId=${externalEventId}, waiting callback`);
      await this.state.setAcked({
        externalEventId,
        actorExternalId,
        metadata: rv?.metadata,
      });
      return;
    }

    const delta = typeof rv.delta === 'string' ? rv.delta : '0';
    const signalType = typeof rv.signalType === 'string' ? rv.signalType : 'msg.signal';
    const metadata = rv.metadata ?? { source: 'n8n' };

    await this.finalizeWithDelta({
      actorExternalId,
      externalEventId,
      delta,
      signalType,
      metadata,
    });
  }

  private async finalizeFailed(jobId: string, reason?: string) {
    const job = await this.delegationQueue.getJob(jobId);
    if (!job) return;

    const data: any = job.data;
    const actorExternalId = data.actorExternalId;
    const externalEventId = data.externalEventId;
    await this.state.markFailed({
      externalEventId,
      actorExternalId,
      reason: reason || 'unknown',
    });
    this.logger.warn(
      `FLOW[DELEGATION] failed to deliver/ack externalEventId=${externalEventId}, reason=${reason || 'unknown'}`,
    );
  }

  private async finalizeWithDelta(input: {
    actorExternalId: string;
    externalEventId: string;
    delta: string;
    signalType: string;
    metadata?: any;
  }) {
    // Todo en tx: history_score + actor_score (si NO terminal)
    const shouldEnqueueTransition = await this.prisma.$transaction(async (tx) => {
      const { isTerminal } = await this.scoring.getLifecycleState(tx as any, input.actorExternalId);
      if (isTerminal) return false;

      await this.scoring.applyDeltaIfNew(tx as any, {
        actorExternalId: input.actorExternalId,
        externalEventId: input.externalEventId,
        delta: input.delta,
        signalType: input.signalType,
        metadata: input.metadata,
      });

      return true;
    });

    // transición siempre al final
    if (!shouldEnqueueTransition) return;

    await this.transitionsQueue.add(
      'actor.transition.evaluate',
      { actorExternalId: input.actorExternalId, triggerExternalEventId: input.externalEventId },
      { jobId: `tr_${input.externalEventId}` },
    );
  }
}
