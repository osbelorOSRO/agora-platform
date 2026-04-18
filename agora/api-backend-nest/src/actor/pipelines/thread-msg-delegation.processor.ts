import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Job } from 'bullmq';
import { Q_THREAD_MSG_DELEGATION } from '../../queues/queues.constants';
import { getRuntimeSecret } from '../../shared/runtime-secrets';

@Injectable()
@Processor(Q_THREAD_MSG_DELEGATION, { concurrency: 1 })
export class ThreadMsgDelegationProcessor extends WorkerHost {
  private readonly logger = new Logger(ThreadMsgDelegationProcessor.name);

  async process(job: Job<any>) {
    if (job.name !== 'thread.msg.delegation') {
      this.logger.warn(`Job ignorado en ${Q_THREAD_MSG_DELEGATION}: name=${job.name}, id=${job.id}`);
      return { status: 'ignored' };
    }

    const webhookUrl = process.env.N8N_THREAD_MSG_DELEGATION_WEBHOOK_URL;
    if (!webhookUrl) {
      this.logger.warn(`FLOW[THREAD_DELEGATION] skip externalEventId=${job.data?.externalEventId} reason=missing_webhook_url`);
      return { status: 'skipped', reason: 'missing_webhook_url' };
    }

    const authToken = await getRuntimeSecret('N8N_SECRET_TOKEN');
    const env = job.data;

    this.logger.log(
      `FLOW[THREAD_DELEGATION] start externalEventId=${env.externalEventId}, sessionId=${env.sessionId}, jobId=${job.id}`,
    );

    const response = await axios.post(
      webhookUrl,
      {
        ...env,
        jobTrace: {
          queueName: Q_THREAD_MSG_DELEGATION,
          jobId: String(job.id),
          jobName: job.name,
          createdAtMs: job.timestamp,
          processedAtMs: job.processedOn ?? Date.now(),
          attemptsMade: job.attemptsMade,
          maxAttempts: job.opts.attempts ?? null,
        },
      },
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
      throw new Error(`n8n thread webhook did not accept task externalEventId=${env.externalEventId}`);
    }

    const metadata = rv.metadata ?? { source: 'n8n', status: response.status };

    this.logger.log(
      `FLOW[THREAD_DELEGATION] accepted externalEventId=${env.externalEventId}, sessionId=${env.sessionId}, jobId=${job.id}`,
    );

    return {
      status: 'accepted',
      pending: false,
      metadata,
    };
  }
}
