import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ContactService } from './contact.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { WhatsappIdentityService } from './whatsapp-identity.service';
import { WEBSOCKET_NOTIFIER_GATEWAY } from '../../websocket-notifier/interfaces/websocket-notifier-gateway.interface';
import { THREAD_GATEWAY } from '../interfaces/thread-gateway.interface';

const prisma = {
  $queryRawUnsafe: jest.fn(),
  $executeRawUnsafe: jest.fn(),
};
const ws = { notificarMetaInboxThreadUpsert: jest.fn() };
const whatsappIdentity = { normalizeWhatsappPhone: jest.fn() };
const thread = {
  getThreadIdentity: jest.fn(),
  getThreadRow: jest.fn(),
  resolveSessionIdForAutomation: jest.fn(),
};

async function build(): Promise<ContactService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ContactService,
      { provide: PrismaService, useValue: prisma },
      { provide: WhatsappIdentityService, useValue: whatsappIdentity },
      { provide: WEBSOCKET_NOTIFIER_GATEWAY, useValue: ws },
      { provide: THREAD_GATEWAY, useValue: thread },
    ],
  }).compile();
  return module.get(ContactService);
}

describe('ContactService', () => {
  let service: ContactService;
  beforeEach(async () => {
    jest.clearAllMocks();
    service = await build();
  });

  describe('listContacts', () => {
    it('acota limit a [1,200] y offset a >=0', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      const r = await service.listContacts({ limit: 999, offset: -10 });
      expect(r.limit).toBe(200);
      expect(r.offset).toBe(0);
      expect(r.total).toBe(0);
      expect(r.hasNext).toBe(false);
      expect(r.items).toEqual([]);
    });

    it('pasa flags hasObjectType/hasSearch correctos a la query', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);
      await service.listContacts({ search: 'ana', objectType: 'whatsapp' });
      // args: (sql, hasObjectType, objectType, hasSearch, search)
      const args = prisma.$queryRawUnsafe.mock.calls[0];
      expect(args[1]).toBe(true); // hasObjectType (WHATSAPP válido)
      expect(args[2]).toBe('WHATSAPP'); // normalizado a mayúsculas
      expect(args[3]).toBe(true); // hasSearch
      expect(args[4]).toBe('ana');
    });

    it('calcula total/hasNext y quita totalCount de los items', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([
        { actorExternalId: 'a1', displayName: 'Ana', totalCount: '10' },
      ]);
      const r = await service.listContacts({ limit: 1, offset: 0 });
      expect(r.total).toBe(10);
      expect(r.hasNext).toBe(true); // 0 + 1 < 10
      expect(r.items[0]).not.toHaveProperty('totalCount');
      expect(r.items[0]).toHaveProperty('actorExternalId', 'a1');
    });
  });

  describe('updateContact', () => {
    it('lanza NotFoundException si la sesión no existe', async () => {
      thread.getThreadIdentity.mockResolvedValue(null);
      await expect(
        service.updateContact('sess-x', { displayName: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });

    it('persiste, notifica por websocket y retorna ok', async () => {
      thread.getThreadIdentity.mockResolvedValue({
        actorExternalId: 'a1',
        objectType: 'WHATSAPP',
      });
      prisma.$executeRawUnsafe.mockResolvedValue(undefined);
      thread.getThreadRow.mockResolvedValue({
        threadId: 99,
        displayName: 'Ana',
      });

      const r = await service.updateContact('sess-1', {
        displayName: 'Ana',
        phone: '56911112222',
      });

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(1);
      expect(ws.notificarMetaInboxThreadUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 'sess-1', actorExternalId: 'a1' }),
      );
      expect(r).toMatchObject({
        ok: true,
        sessionId: 'sess-1',
        actorExternalId: 'a1',
        objectType: 'WHATSAPP',
      });
    });
  });

  describe('updateContactForAutomation', () => {
    it('resuelve sessionId y adjunta el thread resultante', async () => {
      thread.resolveSessionIdForAutomation.mockResolvedValue('sess-auto');
      thread.getThreadIdentity.mockResolvedValue({
        actorExternalId: 'a2',
        objectType: 'PAGE',
      });
      prisma.$executeRawUnsafe.mockResolvedValue(undefined);
      thread.getThreadRow.mockResolvedValue({ threadId: 7 });

      const r = await service.updateContactForAutomation({
        actorExternalId: 'a2',
        objectType: 'PAGE',
        displayName: 'Bot',
      } as any);

      expect(thread.resolveSessionIdForAutomation).toHaveBeenCalledTimes(1);
      expect(r.sessionId).toBe('sess-auto');
      expect(r.thread).toEqual({ threadId: 7 });
    });
  });
});
