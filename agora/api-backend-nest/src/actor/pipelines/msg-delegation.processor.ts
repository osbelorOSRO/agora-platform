import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Q_MSG_DELEGATION } from '../../queues/queues.constants';
import { Job, Queue } from 'bullmq';
import { MsgDelegationStateService } from './msg-delegation-state.service';
import { MsgDelegationCompletionService } from './msg-delegation-completion.service';
import { getRuntimeSecret } from '../../shared/runtime-secrets';

@Injectable()
@Processor(Q_MSG_DELEGATION, { concurrency: 1 })
export class MsgDelegationProcessor extends WorkerHost {
  private readonly logger = new Logger(MsgDelegationProcessor.name);

  constructor(
    private readonly state: MsgDelegationStateService,
    private readonly completion: MsgDelegationCompletionService,
    @InjectQueue(Q_MSG_DELEGATION) private readonly delegationQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<any>) {
    if (job.name === 'msg.delegation.timeout') {
      const data = job.data || {};
      const result = await this.completion.completeWithoutSignal({
        externalEventId: data.externalEventId,
        actorExternalId: data.actorExternalId,
        reason: 'n8n_callback_timeout',
        metadata: {
          source: 'timeout_guard',
          timeoutMs: data.timeoutMs,
        },
      });

      this.logger.warn(
        `FLOW[DELEGATION] timeout resolved externalEventId=${data.externalEventId}, result=${JSON.stringify(result)}`,
      );
      return result;
    }

    if (job.name !== 'msg.delegation') {
      this.logger.warn(`Job ignorado en ${Q_MSG_DELEGATION}: name=${job.name}, id=${job.id}`);
      return { status: 'accepted', pending: true, metadata: { ignoredJobName: job.name } };
    }

    const webhookUrl = process.env.N8N_MSG_DELEGATION_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error('Missing env N8N_MSG_DELEGATION_WEBHOOK_URL');
    }

    const authToken = await getRuntimeSecret('N8N_SECRET_TOKEN');
    const env = job.data;
    const callbackCompleteUrl = process.env.N8N_MSG_DELEGATION_CALLBACK_COMPLETE_URL;
    const callbackFailedUrl = process.env.N8N_MSG_DELEGATION_CALLBACK_FAILED_URL;

    await this.state.setPending({
      externalEventId: env.externalEventId,
      actorExternalId: env.actorExternalId,
      metadata: {
        queueName: Q_MSG_DELEGATION,
        jobId: String(job.id),
        jobName: job.name,
      },
    });

    const payloadToN8n = {
      ...env,
      jobTrace: {
        queueName: Q_MSG_DELEGATION,
        jobId: String(job.id),
        jobName: job.name,
        createdAtMs: job.timestamp,
        processedAtMs: job.processedOn ?? Date.now(),
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts ?? null,
      },
      callbacks: {
        completeUrl: callbackCompleteUrl,
        failedUrl: callbackFailedUrl,
      },
    };

    this.logger.log(
      `FLOW[DELEGATION] start externalEventId=${env.externalEventId}, jobId=${job.id}, attempt=${job.attemptsMade}/${job.opts.attempts ?? 1}`,
    );

    const response = await axios.post(
      webhookUrl,
      payloadToN8n,
      {
        timeout: 20000,
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          'Content-Type': 'application/json',
        },
      },
    );

    const rv = response.data ?? {};
    const accepted = rv.accepted !== false;

    if (!accepted) {
      throw new Error(`n8n did not accept task externalEventId=${env.externalEventId}`);
    }

    const metadata = rv.metadata ?? { source: 'n8n', status: response.status };

    await this.state.setAcked({
      externalEventId: env.externalEventId,
      actorExternalId: env.actorExternalId,
      metadata,
    });

    const callbackTimeoutMs = parseInt(
      process.env.MSG_DELEGATION_CALLBACK_TIMEOUT_MS || '180000',
      10,
    );
    await this.delegationQueue.add(
      'msg.delegation.timeout',
      {
        externalEventId: env.externalEventId,
        actorExternalId: env.actorExternalId,
        timeoutMs: callbackTimeoutMs,
      },
      {
        jobId: `timeout_${env.externalEventId}`,
        delay: callbackTimeoutMs,
        attempts: 1,
        removeOnComplete: 5000,
        removeOnFail: 5000,
      },
    );

    this.logger.log(
      `FLOW[DELEGATION] accepted externalEventId=${env.externalEventId}, jobId=${job.id}`,
    );

    return {
      status: 'accepted',
      pending: true,
      metadata,
    };
  }
}
