import { ThreadEventService } from './thread-event.service';

const mockPrisma = () => ({
  $executeRawUnsafe: jest.fn().mockResolvedValue(1),
  $queryRawUnsafe: jest.fn().mockResolvedValue([]),
});

const validEvent = () => ({
  sessionId: 'sess-1',
  actorExternalId: 'actor-1',
  objectType: 'WHATSAPP',
  eventType: 'message',
});

describe('ThreadEventService', () => {
  describe('recordThreadEvent', () => {
    it('inserta el evento con valores por defecto', async () => {
      const prisma = mockPrisma();
      const svc = new ThreadEventService(prisma as any);
      await svc.recordThreadEvent(validEvent());
      expect(prisma.$executeRawUnsafe).toHaveBeenCalled();
    });

    it('usa eventSource=SYSTEM cuando no se provee', async () => {
      const prisma = mockPrisma();
      const svc = new ThreadEventService(prisma as any);
      await svc.recordThreadEvent(validEvent());
      const args = (prisma.$executeRawUnsafe as jest.Mock).mock.calls[0];
      expect(args).toContain('SYSTEM');
    });

    it('construye dedupeKey desde eventType+externalEventId', async () => {
      const prisma = mockPrisma();
      const svc = new ThreadEventService(prisma as any);
      await svc.recordThreadEvent({
        ...validEvent(),
        externalEventId: 'ext-123',
      });
      const args = (prisma.$executeRawUnsafe as jest.Mock).mock.calls[0];
      expect(args).toContain('message:ext-123');
    });
  });

  describe('listMessages', () => {
    it('devuelve lista vacía si no hay mensajes', async () => {
      const svc = new ThreadEventService(mockPrisma() as any);
      const result = await svc.listMessages('sess-1');
      expect(result).toEqual([]);
    });
  });

  describe('normalizeLegacyMessageContentJson (vía listMessages)', () => {
    const makeSvcWithRow = (contentJson: unknown) => {
      const prisma = mockPrisma();
      prisma.$queryRawUnsafe.mockResolvedValue([
        {
          externalEventId: 'e1',
          messageExternalId: null,
          sessionId: 'sess-1',
          actorExternalId: 'actor-1',
          objectType: 'WHATSAPP',
          eventKind: 'message',
          direction: 'INBOUND',
          contentText: 'hola',
          contentJson,
          status: 'delivered',
          occurredAt: new Date(),
        },
      ]);
      return new ThreadEventService(prisma as any);
    };

    it('pasa null sin transformar', async () => {
      const svc = makeSvcWithRow(null);
      const [msg] = await svc.listMessages('sess-1');
      expect(msg.contentJson).toBeNull();
    });

    it('devuelve el objeto original si ya tiene mediaUrl y mediaType audio', async () => {
      const svc = makeSvcWithRow({
        mediaType: 'audio',
        mediaUrl: 'http://audio.mp3',
      });
      const [msg] = await svc.listMessages('sess-1');
      expect((msg.contentJson as any).mediaUrl).toBe('http://audio.mp3');
    });

    it('extrae mediaUrl de message.attachments para tipo image', async () => {
      const contentJson = {
        message: {
          attachments: [{ type: 'image', payload: { url: 'http://img.jpg' } }],
        },
      };
      const svc = makeSvcWithRow(contentJson);
      const [msg] = await svc.listMessages('sess-1');
      expect((msg.contentJson as any).mediaType).toBe('image');
      expect((msg.contentJson as any).mediaUrl).toBe('http://img.jpg');
    });

    it('extrae mediaUrl de top-level url para tipo audio', async () => {
      const contentJson = { type: 'audio', url: 'http://audio.mp3' };
      const svc = makeSvcWithRow(contentJson);
      const [msg] = await svc.listMessages('sess-1');
      expect((msg.contentJson as any).mediaType).toBe('audio');
      expect((msg.contentJson as any).mediaUrl).toBe('http://audio.mp3');
    });

    it('extrae mediaUrl de attachment.payload.url para tipo image', async () => {
      const contentJson = {
        attachment: { type: 'image', payload: { url: 'http://graph.jpg' } },
      };
      const svc = makeSvcWithRow(contentJson);
      const [msg] = await svc.listMessages('sess-1');
      expect((msg.contentJson as any).mediaType).toBe('image');
      expect((msg.contentJson as any).mediaUrl).toBe('http://graph.jpg');
    });

    it('devuelve objeto sin cambios si no hay attachments relevantes', async () => {
      const svc = makeSvcWithRow({ text: 'hola', type: 'text' });
      const [msg] = await svc.listMessages('sess-1');
      expect((msg.contentJson as any).text).toBe('hola');
    });
  });
});
