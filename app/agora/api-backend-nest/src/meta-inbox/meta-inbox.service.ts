import { Injectable, OnModuleInit } from '@nestjs/common';
import { MetaInboxSchemaService } from './services/meta-inbox-schema.service';
import { ThreadService, ThreadSelectorInput } from './services/thread.service';
import { ContactService } from './services/contact.service';
import { MessageSendService } from './services/message-send.service';
import { OfferContextService } from './services/offer-context.service';
import { WhatsappIdentityService } from './services/whatsapp-identity.service';
import { ThreadEventService, ThreadEventInput } from './services/thread-event.service';

@Injectable()
export class MetaInboxService implements OnModuleInit {
  constructor(
    private readonly schema: MetaInboxSchemaService,
    private readonly threadService: ThreadService,
    private readonly contactService: ContactService,
    private readonly messageSend: MessageSendService,
    private readonly offerContext: OfferContextService,
    private readonly whatsappIdentity: WhatsappIdentityService,
    private readonly threadEvent: ThreadEventService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.schema.ensureSchema();
  }

  // --- Thread Event ---

  async recordThreadEvent(input: ThreadEventInput): Promise<void> {
    return this.threadEvent.recordThreadEvent(input);
  }

  async listMessages(sessionId: string, includeSystem = false) {
    return this.threadEvent.listMessages(sessionId, includeSystem);
  }

  // --- Threads ---

  async listThreads(input: { limit?: number; offset?: number; includeClosed?: boolean }) {
    return this.threadService.listThreads(input);
  }

  async ensureWhatsappThreadForContact(actorExternalId: string) {
    return this.threadService.ensureWhatsappThreadForContact(actorExternalId);
  }

  async getStageTemplatePaths(stageActual: string) {
    return this.threadService.getStageTemplatePaths(stageActual);
  }

  async updateThreadControl(
    sessionId: string,
    input: { threadStatus?: string; attentionMode?: string; threadStage?: string; stageControl?: Record<string, unknown> },
    eventSource: 'HUMAN' | 'N8N' | 'SYSTEM' | 'API' = 'HUMAN',
  ) {
    return this.threadService.updateThreadControl(sessionId, input, eventSource);
  }

  async reopenThread(sessionId: string) {
    return this.threadService.reopenThread(sessionId);
  }

  async resolveThreadByActor(actorExternalId: string, objectType: string, includeClosed = false) {
    return this.threadService.resolveThreadByActor(actorExternalId, objectType, includeClosed);
  }

  async updateThreadControlForAutomation(input: ThreadSelectorInput & {
    threadStatus?: string;
    attentionMode?: string;
    threadStage?: string;
    stageControl?: Record<string, unknown>;
  }) {
    return this.threadService.updateThreadControlForAutomation(input);
  }

  // --- Contacts ---

  async listContacts(input: { search?: string; objectType?: string; limit?: number; offset?: number }) {
    return this.contactService.listContacts(input);
  }

  async createWhatsappContact(input: {
    phone: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    rut?: string;
    address?: string;
    email?: string;
    notes?: string;
    city?: string;
    region?: string;
  }) {
    return this.contactService.createWhatsappContact(input);
  }

  async updateContact(sessionId: string, input: {
    displayName?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    rut?: string;
    address?: string;
    email?: string;
    notes?: string;
    city?: string;
    region?: string;
  }) {
    return this.contactService.updateContact(sessionId, input);
  }

  async updateContactForAutomation(input: ThreadSelectorInput & {
    displayName?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    rut?: string;
    address?: string;
    email?: string;
    notes?: string;
    city?: string;
    region?: string;
  }) {
    return this.contactService.updateContactForAutomation(input);
  }

  // --- WhatsApp Identity ---

  async resolveWhatsappIdentity(input: { sessionId?: string; actorExternalId?: string; phone?: string }) {
    return this.whatsappIdentity.resolveWhatsappIdentity(input);
  }

  async listWhatsappAdLeadStats(input: { sourceId?: string; limit?: number }) {
    return this.whatsappIdentity.listWhatsappAdLeadStats(input);
  }

  async updateWhatsappBlockStatus(input: {
    action: 'block' | 'unblock';
    sessionId?: string;
    actorExternalId?: string;
    phone?: string;
  }) {
    return this.whatsappIdentity.updateBlockStatus(input);
  }

  // --- Offer Context ---

  async createOfferEventForAutomation(input: {
    sessionId: string;
    stageActual: string;
    tipo: string;
    codigo: string;
    decision?: string;
  }) {
    return this.offerContext.createOfferEventForAutomation(input);
  }

  async getOfferEventById(id: string) {
    return this.offerContext.getOfferEventById(id);
  }

  async updateOfferEventForAutomation(id: string, input: {
    sessionId?: string;
    stageActual?: string;
    tipo?: string;
    codigo?: string;
    decision?: string;
  }) {
    return this.offerContext.updateOfferEventForAutomation(id, input);
  }

  async listOfferEvents(input: { sessionId?: string; codigo?: string; decision?: string; stageActual?: string; tipo?: string }) {
    return this.offerContext.listOfferEvents(input);
  }

  async getOfferContextForAutomation(input: {
    sessionId: string;
    stageActual?: string;
    modo?: string;
    decision?: string;
    currentOfferId?: string;
    currentCodigo?: string;
    lineas?: number;
  }) {
    return this.offerContext.getOfferContextForAutomation(input);
  }

  // --- Message Send ---

  async sendText(sessionId: string, text: string) {
    return this.messageSend.sendText(sessionId, text);
  }

  async sendMedia(sessionId: string, file: Express.Multer.File, caption?: string) {
    return this.messageSend.sendMedia(sessionId, file, caption);
  }

  async sendSystemText(input: ThreadSelectorInput & { text: string }) {
    return this.messageSend.sendSystemText(input);
  }

  async sendThreadMessage(input: ThreadSelectorInput & {
    senderType?: 'HUMAN' | 'N8N' | 'SYSTEM';
    text?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'audio' | 'document' | 'video';
    caption?: string;
    fileName?: string;
    mimeType?: string;
  }) {
    return this.messageSend.sendThreadMessage(input);
  }
}
