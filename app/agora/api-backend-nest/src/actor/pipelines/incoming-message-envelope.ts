export interface IncomingMessageEnvelope {
  externalEventId: string;
  actorExternalId: string;
  provider: string;
  objectType: string;
  pipeline?: string;
  eventType?: string;
  /** Siempre string — BullMQ serializa a JSON antes de encolar */
  occurredAt: string;
  /** Payload raw del canal externo (Baileys/Meta); estructura variable */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any>;
}
