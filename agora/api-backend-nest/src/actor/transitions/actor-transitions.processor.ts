import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { Q_ACTOR_TRANSITIONS } from '../../queues/queues.constants';

@Processor(Q_ACTOR_TRANSITIONS, { concurrency: 1 })
export class ActorTransitionsProcessor extends WorkerHost {
  private readonly logger = new Logger(ActorTransitionsProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any>) {
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

      // terminal => no hace nada
      if (last.state === 'QUALIFIED' || last.state === 'BLOCKED') {
        this.logger.log(`FLOW[TRANSITION] already terminal actorExternalId=${actorExternalId}`);
        return;
      }

      const scoreRow = await tx.actor_score.findUnique({
        where: { actor_external_id: actorExternalId },
        select: { score: true },
      });

      const score: any = scoreRow?.score ?? 0;

      // OJO: aquí va tu tabla de reglas.
      // Por ahora: ejemplo mínimo coherente:
      let nextState: 'NEW' | 'CHURNED' | 'QUALIFIED' | 'BLOCKED' | null = null;

      // score < 0 => BLOCKED
      if (score < 0) nextState = 'BLOCKED';
      // score >= 60 => QUALIFIED
      else if (score >= 60) nextState = 'QUALIFIED';
      // 0..60 y estaba NEW => CHURNED (si tu regla lo define)
      else if (last.state === 'NEW') nextState = 'CHURNED';

      if (!nextState) {
        this.logger.log(`FLOW[TRANSITION] no transition actorExternalId=${actorExternalId}`);
        return;
      }
      if (nextState === last.state) {
        this.logger.log(`FLOW[TRANSITION] unchanged state=${last.state} actorExternalId=${actorExternalId}`);
        return;
      }

      await tx.actor_lifecycle.create({
        data: {
          actor_external_id: actorExternalId,
          state: nextState,
        },
      });
      this.logger.log(
        `FLOW[TRANSITION] transitioned actorExternalId=${actorExternalId}, from=${last.state}, to=${nextState}`,
      );
    });
  }
}
