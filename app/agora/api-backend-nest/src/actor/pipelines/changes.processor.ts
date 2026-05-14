import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ActorBootstrapService } from '../bootstrap/actor-bootstrap.service';
import { ActorScoringService } from '../scoring/actor-scoring.service';
import { ActorEventsService } from '../../actor-events/actor-events.service';
import { Q_ACTOR_TRANSITIONS, Q_META_CHANGES } from '../../queues/queues.constants';

@Processor(Q_META_CHANGES, { concurrency: 1 })
export class ChangesProcessor extends WorkerHost {
  private readonly logger = new Logger(ChangesProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly actorEvents: ActorEventsService,
    private readonly bootstrap: ActorBootstrapService,
    private readonly scoring: ActorScoringService,
    @InjectQueue(Q_ACTOR_TRANSITIONS) private readonly transitionsQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<any>) {
    if (job.name !== 'meta.change') {
      this.logger.warn(`Job ignorado en ${Q_META_CHANGES}: name=${job.name}, id=${job.id}`);
      return;
    }

    const env = job.data;
    this.logger.log(`FLOW[CHANGE] start externalEventId=${env.externalEventId}`);

    await this.prisma.$transaction(async (tx) => {
      // 1) actor-events (SIEMPRE): event_history
      await this.actorEvents
        .registerEvent({
          externalEventId: env.externalEventId,
          actorExternalId: env.actorExternalId,
          provider: env.provider,
          objectType: env.objectType,
          pipeline: env.pipeline,
          eventType: env.eventType,
          payload: env.payload,
          occurredAt: new Date(env.occurredAt),
        })
        .catch(() => {
          // idempotencia por external_event_id (unique)
        });
      this.logger.log(`FLOW[CHANGE] event_history ok externalEventId=${env.externalEventId}`);

      // 2) bootstrap
      await this.bootstrap.ensureActorExists(tx as any, env.actorExternalId);
      this.logger.log(`FLOW[CHANGE] bootstrap ok actorExternalId=${env.actorExternalId}`);

      // 3) terminal gate
      const { isTerminal } = await this.scoring.getLifecycleState(tx as any, env.actorExternalId);
      if (isTerminal) {
        this.logger.log(`FLOW[CHANGE] terminal gate stop actorExternalId=${env.actorExternalId}`);
        return;
      }

      // 4) delta determinista (ejemplo; tú lo conectas a tu tabla real)
      const delta = this.computeDeterministicDelta(env);

      // 5) history_score + actor_score (solo si NO terminal)
      await this.scoring.applyDeltaIfNew(tx as any, {
        actorExternalId: env.actorExternalId,
        externalEventId: env.externalEventId,
        delta,
        signalType: `change:${env.eventType}`,
        metadata: { pipeline: 'CHANGES' },
      });
      this.logger.log(
        `FLOW[CHANGE] scoring applied externalEventId=${env.externalEventId}, delta=${delta}`,
      );
    });

    // 6) transición siempre último paso (y solo si NO terminal)
    // Para evitar re-leer fuera tx, re-leemos rápido:
    const last = await this.prisma.actor_lifecycle.findFirst({
      where: { actor_external_id: env.actorExternalId },
      orderBy: { occurred_at: 'desc' },
      select: { state: true },
    });
    const isTerminalNow = last?.state === 'QUALIFIED' || last?.state === 'BLOCKED';
    if (isTerminalNow) {
      this.logger.log(`FLOW[CHANGE] transition skip terminal actorExternalId=${env.actorExternalId}`);
      return;
    }

    await this.transitionsQueue.add(
      'actor.transition.evaluate',
      { actorExternalId: env.actorExternalId, triggerExternalEventId: env.externalEventId },
      { jobId: `tr:${env.externalEventId}` },
    );
    this.logger.log(`FLOW[CHANGE] transition enqueued externalEventId=${env.externalEventId}`);
  }

  private computeDeterministicDelta(env: any): string {
    // placeholder coherente: por defecto 0
    // aquí tú mapeas eventType->delta determinista
    return '0';
  }
}
