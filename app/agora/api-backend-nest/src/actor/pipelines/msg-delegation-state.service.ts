import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../cache/cache.service';

type PendingState = {
  externalEventId: string;
  actorExternalId: string;
  status: 'PENDING' | 'ACKED' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
  metadata?: any;
};

@Injectable()
export class MsgDelegationStateService {
  private readonly logger = new Logger(MsgDelegationStateService.name);

  constructor(private readonly cache: CacheService) {}

  private pendingKey(externalEventId: string) {
    return `msg:pending:${externalEventId}`;
  }

  private doneKey(externalEventId: string) {
    return `msg:done:${externalEventId}`;
  }

  private pendingTtl(): number {
    return parseInt(process.env.MSG_DELEGATION_PENDING_TTL_SECONDS || '1800', 10);
  }

  private doneTtl(): number {
    return parseInt(process.env.MSG_DELEGATION_DONE_TTL_SECONDS || '604800', 10);
  }

  async setPending(input: {
    externalEventId: string;
    actorExternalId: string;
    metadata?: any;
  }) {
    const now = new Date().toISOString();
    const value: PendingState = {
      externalEventId: input.externalEventId,
      actorExternalId: input.actorExternalId,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata,
    };

    await this.cache.set(this.pendingKey(input.externalEventId), value, this.pendingTtl());
  }

  async setAcked(input: {
    externalEventId: string;
    actorExternalId: string;
    metadata?: any;
  }) {
    const key = this.pendingKey(input.externalEventId);
    const now = new Date().toISOString();
    const prev = await this.cache.get<PendingState>(key);

    const value: PendingState = {
      externalEventId: input.externalEventId,
      actorExternalId: input.actorExternalId,
      status: 'ACKED',
      createdAt: prev?.createdAt || now,
      updatedAt: now,
      metadata: input.metadata ?? prev?.metadata,
    };

    await this.cache.set(key, value, this.pendingTtl());
  }

  async markFailed(input: { externalEventId: string; actorExternalId: string; reason?: string }) {
    const key = this.pendingKey(input.externalEventId);
    const now = new Date().toISOString();
    const prev = await this.cache.get<PendingState>(key);

    const value: PendingState = {
      externalEventId: input.externalEventId,
      actorExternalId: input.actorExternalId,
      status: 'FAILED',
      createdAt: prev?.createdAt || now,
      updatedAt: now,
      metadata: { ...(prev?.metadata || {}), reason: input.reason || 'unknown' },
    };

    await this.cache.set(key, value, this.pendingTtl());
  }

  async markCompleted(input: { externalEventId: string; actorExternalId: string; metadata?: any }) {
    await this.cache.set(
      this.doneKey(input.externalEventId),
      {
        externalEventId: input.externalEventId,
        actorExternalId: input.actorExternalId,
        completedAt: new Date().toISOString(),
        metadata: input.metadata,
      },
      this.doneTtl(),
    );
    await this.cache.del(this.pendingKey(input.externalEventId));
  }

  async isDone(externalEventId: string): Promise<boolean> {
    const value = await this.cache.get(this.doneKey(externalEventId));
    return Boolean(value);
  }

  async getPending(externalEventId: string): Promise<PendingState | undefined> {
    return this.cache.get<PendingState>(this.pendingKey(externalEventId));
  }

  async ensurePending(externalEventId: string) {
    const pending = await this.getPending(externalEventId);
    if (!pending) {
      this.logger.warn(`FLOW[CALLBACK] pending state not found externalEventId=${externalEventId}`);
    }
    return pending;
  }
}
