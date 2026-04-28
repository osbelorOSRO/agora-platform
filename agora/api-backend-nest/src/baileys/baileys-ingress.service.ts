import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Q_META_MESSAGES } from '../queues/queues.constants';

type BaileysEnvelope = {
  externalEventId?: unknown;
  actorExternalId?: unknown;
  provider?: unknown;
  objectType?: unknown;
  pipeline?: unknown;
  eventType?: unknown;
  occurredAt?: unknown;
  receivedAt?: unknown;
  payload?: unknown;
};

@Injectable()
export class BaileysIngressService {
  private readonly logger = new Logger(BaileysIngressService.name);

  constructor(
    @InjectQueue(Q_META_MESSAGES)
    private readonly messagesQueue: Queue,
  ) {}

  async ingestEnvelope(input: BaileysEnvelope) {
    const envelope = this.normalizeEnvelope(input);

    await this.messagesQueue.add('baileys.message', envelope, {
      jobId: this.queueJobId(envelope.externalEventId),
    });

    this.logger.log(
      `FLOW[QUEUE] baileys.message enqueued externalEventId=${envelope.externalEventId}`,
    );

    return {
      accepted: true,
      externalEventId: envelope.externalEventId,
    };
  }

  private normalizeEnvelope(input: BaileysEnvelope) {
    const externalEventId = this.requireString(input.externalEventId, 'externalEventId');
    const actorExternalId = this.requireString(input.actorExternalId, 'actorExternalId');
    const eventType = this.requireString(input.eventType, 'eventType');
    const occurredAt = this.requireDateString(input.occurredAt, 'occurredAt');
    const payload = this.requireRecord(input.payload, 'payload');

    return {
      externalEventId,
      actorExternalId,
      provider: 'BAILEYS',
      objectType: 'WHATSAPP',
      pipeline: 'MESSAGES',
      eventType,
      occurredAt,
      receivedAt: this.optionalDateString(input.receivedAt) || new Date().toISOString(),
      payload: {
        ...payload,
        platform: payload.platform || 'whatsapp',
      },
    };
  }

  private requireString(value: unknown, field: string): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`Campo requerido inválido: ${field}`);
    }
    return value.trim();
  }

  private requireRecord(value: unknown, field: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException(`Campo requerido inválido: ${field}`);
    }
    return value as Record<string, unknown>;
  }

  private requireDateString(value: unknown, field: string): string {
    const raw = this.requireString(value, field);
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Fecha inválida: ${field}`);
    }
    return date.toISOString();
  }

  private optionalDateString(value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  private queueJobId(externalEventId: string): string {
    return externalEventId.replace(/:/g, '_').slice(0, 255);
  }
}
