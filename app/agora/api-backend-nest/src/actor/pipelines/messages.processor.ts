import { Processor, WorkerHost, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ActorBootstrapService } from '../bootstrap/actor-bootstrap.service';
import { ActorScoringService } from '../scoring/actor-scoring.service';
import { ActorEventsService } from '../../actor-events/actor-events.service';
import { Q_META_MESSAGES, Q_MSG_DELEGATION, Q_THREAD_MSG_DELEGATION } from '../../queues/queues.constants';
import { MessageNormalizerService } from './services/message-normalizer.service';
import { DelegationGateService } from './services/delegation-gate.service';
import { IncomingMessagePersistenceService } from './services/incoming-message-persistence.service';

@Processor(Q_META_MESSAGES, { concurrency: 1 })
export class MessagesProcessor extends WorkerHost {
  private readonly logger = new Logger(MessagesProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly actorEvents: ActorEventsService,
    private readonly bootstrap: ActorBootstrapService,
    private readonly scoring: ActorScoringService,
    private readonly normalizer: MessageNormalizerService,
    private readonly delegationGate: DelegationGateService,
    private readonly messagePersistence: IncomingMessagePersistenceService,
    @InjectQueue(Q_MSG_DELEGATION) private readonly delegationQueue: Queue,
    @InjectQueue(Q_THREAD_MSG_DELEGATION) private readonly threadDelegationQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<void> {
    if (job.name !== 'meta.message' && job.name !== 'baileys.message') {
      this.logger.warn(`Job ignorado en ${Q_META_MESSAGES}: name=${job.name}, id=${job.id}`);
      return;
    }

    const env = job.data;
    this.logger.log(`FLOW[MESSAGE] start externalEventId=${env.externalEventId}`);
    const eventKind = String(env?.eventType || '').replace(/^messaging\./, '') || 'unknown';
    const messageDirection = this.normalizer.resolveDirection(env?.payload || {}, eventKind);

    await this.prisma.$transaction(async (tx) => {
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
      this.logger.log(`FLOW[MESSAGE] event_history ok externalEventId=${env.externalEventId}`);

      await this.bootstrap.ensureActorExists(tx, env.actorExternalId);
      this.logger.log(`FLOW[MESSAGE] bootstrap ok actorExternalId=${env.actorExternalId}`);
    });

    if (eventKind === 'message_echo') {
      await this.messagePersistence.handlePageEcho(env);
      this.logger.log(`FLOW[MESSAGE] done externalEventId=${env.externalEventId}`);
      return;
    }

    let inboxPersistResult: { inserted: boolean; primedFirstDelegate: boolean } | null = null;
    if (this.delegationGate.isInboxMessageEvent(env?.eventType)) {
      inboxPersistResult = await this.messagePersistence.persistMessageSession(env);
      this.logger.log(`FLOW[MESSAGE] inbox persisted actor=${env.actorExternalId}`);
      if (!inboxPersistResult.inserted) {
        this.logger.warn(`FLOW[MESSAGE] duplicate inbox event stop externalEventId=${env.externalEventId}`);
        return;
      }
    } else {
      this.logger.log(`FLOW[MESSAGE] inbox skip non-message eventType=${env?.eventType}`);
    }

    if (!this.delegationGate.isDelegableIncomingEvent(env?.provider, env?.eventType, messageDirection)) {
      this.logger.log(
        `FLOW[MESSAGE] delegation skipped actor=${env.actorExternalId} reason=non_delegable_event ` +
        `eventType=${env?.eventType || 'unknown'} direction=${messageDirection}`,
      );
      this.logger.log(`FLOW[MESSAGE] done externalEventId=${env.externalEventId}`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const delegationControl = await this.delegationGate.getDelegationControlState(
        tx,
        env.actorExternalId,
        String(env.objectType || 'PAGE'),
      );

      if (delegationControl?.blocked) {
        this.logger.log(
          `FLOW[MESSAGE] delegation skipped actor=${env.actorExternalId} reason=${delegationControl.reason} ` +
          `threadStatus=${delegationControl.threadStatus || 'null'} attentionMode=${delegationControl.attentionMode || 'null'}`,
        );
        if (delegationControl.reason === 'awaiting_first_incoming_delegate' && delegationControl.sessionId) {
          await this.delegationGate.clearAwaitingFirstIncomingDelegate(tx, delegationControl.sessionId);
        }
        return;
      }

      if (delegationControl?.sessionId && (delegationControl.attentionMode ?? 'N8N') === 'N8N') {
        const threadDelegationPayload = await this.delegationGate.buildThreadDelegationPayload(
          tx,
          env,
          delegationControl,
        );
        await this.threadDelegationQueue.add(
          'thread.msg.delegation',
          threadDelegationPayload,
          {
            jobId: `thread_${env.externalEventId}`,
            attempts: 5,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 5000,
            removeOnFail: 5000,
          },
        );
        this.logger.log(
          `FLOW[MESSAGE] thread delegated externalEventId=${env.externalEventId} sessionId=${delegationControl.sessionId}`,
        );
      }

      const state = await this.delegationGate.getLatestLifecycleState(tx, env.actorExternalId);

      if (state === 'QUALIFIED') {
        this.logger.log(`FLOW[MESSAGE] inbox branch actor=${env.actorExternalId} state=QUALIFIED`);
        return;
      }

      if (state === 'BLOCKED') {
        this.logger.log(`FLOW[MESSAGE] blocked branch stop actor=${env.actorExternalId}`);
        return;
      }

      const { isTerminal } = await this.scoring.getLifecycleState(tx, env.actorExternalId);

      if (isTerminal) {
        this.logger.log(`FLOW[MESSAGE] terminal gate stop actorExternalId=${env.actorExternalId}`);
        return;
      }

      await this.delegationQueue.add(
        'msg.delegation',
        {
          externalEventId: env.externalEventId,
          actorExternalId: env.actorExternalId,
          occurredAt: env.occurredAt,
          payload: env.payload,
          provider: env.provider,
          objectType: env.objectType,
        },
        {
          jobId: env.externalEventId,
          attempts: 5,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: 5000,
          removeOnFail: 5000,
        },
      );
      this.logger.log(`FLOW[MESSAGE] delegated externalEventId=${env.externalEventId}`);
    });

    this.logger.log(`FLOW[MESSAGE] done externalEventId=${env.externalEventId}`);
  }
}
