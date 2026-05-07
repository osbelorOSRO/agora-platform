export class WhatsappBlockStatusDto {
  action!: 'block' | 'unblock';
  sessionId?: string;
  actorExternalId?: string;
  phone?: string;
}
