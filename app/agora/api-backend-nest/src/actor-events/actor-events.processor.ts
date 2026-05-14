import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ActorEventsService } from './actor-events.service';
import {
  Q_META_MESSAGES,
  Q_META_CHANGES,
  Q_MSG_DELEGATION,
} from '../queues/queues.constants';

/**
 * ====================================
 * META MESSAGES PROCESSOR
 * ====================================
 */
@Processor(Q_META_MESSAGES)
export class ActorEventsProcessor extends WorkerHost {
  private readonly logger = new Logger(ActorEventsProcessor.name);

  constructor(
    private readonly actorEventsService: ActorEventsService,

    @InjectQueue(Q_MSG_DELEGATION)
    private readonly msgDelegationQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<any>) {
    // BullMQ recibe TODOS los jobs de la queue
    // filtramos por nombre
    if (job.name !== 'meta.message') return;

    const data = job.data;

    this.logger.log(
      `Procesando message event ${data.externalEventId}`,
    );

    // 1️⃣ registrar siempre (actor-events)
    await this.actorEventsService.registerEvent(data);

    // 2️⃣ enviar a bootstrap / siguiente capa
    await this.msgDelegationQueue.add(
      'message.bootstrap',
      data,
      {
        jobId: `bootstrap:${data.externalEventId}`,
      },
    );
  }
}

/**
 * ====================================
 * CHANGE EVENTS PROCESSOR
 * ====================================
 */
@Processor(Q_META_CHANGES)
export class ActorChangesProcessor extends WorkerHost {
  private readonly logger = new Logger(ActorChangesProcessor.name);

  constructor(
    private readonly actorEventsService: ActorEventsService,
  ) {
    super();
  }

  async process(job: Job<any>) {
    if (job.name !== 'meta.change') return;

    const data = job.data;

    this.logger.log(
      `Procesando change event ${data.externalEventId}`,
    );

    // registrar siempre
    await this.actorEventsService.registerEvent(data);

    // bootstrap ocurre en siguiente worker
  }
}
