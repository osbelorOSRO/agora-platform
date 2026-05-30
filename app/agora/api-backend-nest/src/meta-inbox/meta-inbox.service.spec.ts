import { MetaInboxService } from './meta-inbox.service';

const mockSchema = { ensureSchema: jest.fn().mockResolvedValue(undefined) };
const mockThread = {
  listThreads: jest.fn(),
  ensureWhatsappThreadForContact: jest.fn(),
  getStageTemplatePaths: jest.fn(),
  updateThreadControl: jest.fn(),
  reopenThread: jest.fn(),
  resolveThreadByActor: jest.fn(),
  updateThreadControlForAutomation: jest.fn(),
};
const mockContact = {
  listContacts: jest.fn(),
  createWhatsappContact: jest.fn(),
  updateContact: jest.fn(),
  updateContactForAutomation: jest.fn(),
};
const mockMsgSend = {
  sendText: jest.fn(),
  sendMedia: jest.fn(),
  sendSystemText: jest.fn(),
  sendThreadMessage: jest.fn(),
};
const mockOffer = {
  createOfferEventForAutomation: jest.fn(),
  getOfferEventById: jest.fn(),
  updateOfferEventForAutomation: jest.fn(),
  listOfferEvents: jest.fn(),
  getOfferContextForAutomation: jest.fn(),
};
const mockWaIdentity = {
  resolveWhatsappIdentity: jest.fn(),
  listWhatsappAdLeadStats: jest.fn(),
  listFcaMarketplaceLeadStats: jest.fn(),
  updateBlockStatus: jest.fn(),
};
const mockThreadEvent = {
  recordThreadEvent: jest.fn(),
  listMessages: jest.fn(),
};

const mockSalesAnalysis = {
  assertSessionExists: jest.fn(),
  upsert: jest.fn(),
  findBySession: jest.fn(),
};

const mockLeadCatalog = {
  listAllRaw: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

function buildService() {
  return new MetaInboxService(
    mockSchema as any,
    mockThread as any,
    mockContact as any,
    mockMsgSend as any,
    mockOffer as any,
    mockWaIdentity as any,
    mockThreadEvent as any,
    mockSalesAnalysis as any,
    mockLeadCatalog as any,
  );
}

describe('MetaInboxService — delegación', () => {
  let svc: MetaInboxService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = buildService();
  });

  // ─── onModuleInit ─────────────────────────────────────────────────────────

  it('onModuleInit llama a schema.ensureSchema', async () => {
    await svc.onModuleInit();
    expect(mockSchema.ensureSchema).toHaveBeenCalledTimes(1);
  });

  // ─── ThreadEvent ──────────────────────────────────────────────────────────

  it('recordThreadEvent delega a threadEvent', async () => {
    const input = { sessionId: 's', eventType: 'OPEN' } as any;
    await svc.recordThreadEvent(input);
    expect(mockThreadEvent.recordThreadEvent).toHaveBeenCalledWith(input);
  });

  it('listMessages delega a threadEvent', async () => {
    mockThreadEvent.listMessages.mockResolvedValue([]);
    await svc.listMessages('sess-1', true);
    expect(mockThreadEvent.listMessages).toHaveBeenCalledWith('sess-1', true);
  });

  // ─── Threads ──────────────────────────────────────────────────────────────

  it('listThreads delega a threadService con el input', async () => {
    mockThread.listThreads.mockResolvedValue([]);
    await svc.listThreads({ limit: 50, offset: 0, includeClosed: false });
    expect(mockThread.listThreads).toHaveBeenCalledWith({
      limit: 50,
      offset: 0,
      includeClosed: false,
    });
  });

  it('ensureWhatsappThreadForContact delega a threadService', async () => {
    mockThread.ensureWhatsappThreadForContact.mockResolvedValue({
      sessionId: 's',
    });
    await svc.ensureWhatsappThreadForContact('actor@s.whatsapp.net');
    expect(mockThread.ensureWhatsappThreadForContact).toHaveBeenCalledWith(
      'actor@s.whatsapp.net',
    );
  });

  it('getStageTemplatePaths delega a threadService', async () => {
    mockThread.getStageTemplatePaths.mockResolvedValue({ paths: [] });
    await svc.getStageTemplatePaths('oferta');
    expect(mockThread.getStageTemplatePaths).toHaveBeenCalledWith('oferta');
  });

  it('updateThreadControl delega con eventSource HUMAN por defecto', async () => {
    mockThread.updateThreadControl.mockResolvedValue({});
    await svc.updateThreadControl('sess-1', { threadStatus: 'OPEN' });
    expect(mockThread.updateThreadControl).toHaveBeenCalledWith(
      'sess-1',
      { threadStatus: 'OPEN' },
      'HUMAN',
    );
  });

  it('reopenThread delega a threadService', async () => {
    mockThread.reopenThread.mockResolvedValue({});
    await svc.reopenThread('sess-1');
    expect(mockThread.reopenThread).toHaveBeenCalledWith('sess-1');
  });

  it('resolveThreadByActor delega con includeClosed', async () => {
    mockThread.resolveThreadByActor.mockResolvedValue(null);
    await svc.resolveThreadByActor('actor-1', 'WHATSAPP', true);
    expect(mockThread.resolveThreadByActor).toHaveBeenCalledWith(
      'actor-1',
      'WHATSAPP',
      true,
    );
  });

  // ─── Contacts ─────────────────────────────────────────────────────────────

  it('listContacts delega a contactService', async () => {
    mockContact.listContacts.mockResolvedValue({ items: [] });
    await svc.listContacts({ search: 'juan', limit: 20 });
    expect(mockContact.listContacts).toHaveBeenCalledWith({
      search: 'juan',
      limit: 20,
    });
  });

  it('createWhatsappContact delega a contactService', async () => {
    mockContact.createWhatsappContact.mockResolvedValue({
      actorExternalId: '569@s.whatsapp.net',
    });
    await svc.createWhatsappContact({
      phone: '+56911223344',
      displayName: 'Juan',
    });
    expect(mockContact.createWhatsappContact).toHaveBeenCalledWith({
      phone: '+56911223344',
      displayName: 'Juan',
    });
  });

  it('updateContact delega a contactService', async () => {
    mockContact.updateContact.mockResolvedValue({});
    await svc.updateContact('sess-1', { displayName: 'Juan Updated' });
    expect(mockContact.updateContact).toHaveBeenCalledWith('sess-1', {
      displayName: 'Juan Updated',
    });
  });

  // ─── Message Send ─────────────────────────────────────────────────────────

  it('sendText delega a messageSend', async () => {
    mockMsgSend.sendText.mockResolvedValue({ messageId: 'm1' });
    await svc.sendText('sess-1', 'Hola');
    expect(mockMsgSend.sendText).toHaveBeenCalledWith('sess-1', 'Hola');
  });

  it('sendThreadMessage delega a messageSend con el input completo', async () => {
    mockMsgSend.sendThreadMessage.mockResolvedValue({});
    const input = {
      sessionId: 'sess-1',
      text: 'Hola',
      senderType: 'HUMAN' as const,
    };
    await svc.sendThreadMessage(input);
    expect(mockMsgSend.sendThreadMessage).toHaveBeenCalledWith(input);
  });

  // ─── WhatsApp Identity ────────────────────────────────────────────────────

  it('resolveWhatsappIdentity delega a whatsappIdentity', async () => {
    mockWaIdentity.resolveWhatsappIdentity.mockResolvedValue({});
    await svc.resolveWhatsappIdentity({ phone: '+56911223344' });
    expect(mockWaIdentity.resolveWhatsappIdentity).toHaveBeenCalledWith({
      phone: '+56911223344',
    });
  });

  it('listWhatsappAdLeadStats delega con limit', async () => {
    mockWaIdentity.listWhatsappAdLeadStats.mockResolvedValue({ items: [] });
    await svc.listWhatsappAdLeadStats({ limit: 500 });
    expect(mockWaIdentity.listWhatsappAdLeadStats).toHaveBeenCalledWith({
      limit: 500,
    });
  });

  it('updateWhatsappBlockStatus delega a whatsappIdentity.updateBlockStatus', async () => {
    mockWaIdentity.updateBlockStatus.mockResolvedValue({});
    await svc.updateWhatsappBlockStatus({
      action: 'block',
      sessionId: 'sess-1',
    });
    expect(mockWaIdentity.updateBlockStatus).toHaveBeenCalledWith({
      action: 'block',
      sessionId: 'sess-1',
    });
  });

  // ─── Offer Context ────────────────────────────────────────────────────────

  it('createOfferEventForAutomation delega a offerContext', async () => {
    mockOffer.createOfferEventForAutomation.mockResolvedValue({ id: 'ev-1' });
    const input = {
      sessionId: 's',
      stageActual: 'oferta',
      tipo: 'alta',
      codigo: 'COD1',
    };
    await svc.createOfferEventForAutomation(input);
    expect(mockOffer.createOfferEventForAutomation).toHaveBeenCalledWith(input);
  });

  it('getOfferEventById delega a offerContext', async () => {
    mockOffer.getOfferEventById.mockResolvedValue({ id: 'ev-1' });
    await svc.getOfferEventById('ev-1');
    expect(mockOffer.getOfferEventById).toHaveBeenCalledWith('ev-1');
  });

  it('listOfferEvents delega a offerContext con filtros', async () => {
    mockOffer.listOfferEvents.mockResolvedValue([]);
    await svc.listOfferEvents({ sessionId: 'sess-1', decision: 'acepta' });
    expect(mockOffer.listOfferEvents).toHaveBeenCalledWith({
      sessionId: 'sess-1',
      decision: 'acepta',
    });
  });
});
