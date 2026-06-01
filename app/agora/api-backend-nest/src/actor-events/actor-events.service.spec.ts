import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../database/prisma/prisma.service';
import { ActorEventsService, ActorEventInput } from './actor-events.service';

const mockPrisma = {
  event_history: {
    create: jest.fn(),
  },
};

const EVENT_STUB: ActorEventInput = {
  externalEventId: 'ext-001',
  actorExternalId: 'wa-56912345678@s.whatsapp.net',
  provider: 'whatsapp',
  objectType: 'message',
  pipeline: 'bandeja_meta',
  eventType: 'incoming',
  payload: { text: 'hola' },
  occurredAt: '2026-06-01T12:00:00Z',
};

describe('ActorEventsService', () => {
  let service: ActorEventsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActorEventsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ActorEventsService>(ActorEventsService);
  });

  describe('registerEvent', () => {
    it('crea un evento en event_history', async () => {
      mockPrisma.event_history.create.mockResolvedValue({ id: 'uuid-1' });

      await service.registerEvent(EVENT_STUB);

      expect(mockPrisma.event_history.create).toHaveBeenCalledWith({
        data: {
          external_event_id: 'ext-001',
          actor_external_id: 'wa-56912345678@s.whatsapp.net',
          provider: 'whatsapp',
          object_type: 'message',
          pipeline: 'bandeja_meta',
          event_type: 'incoming',
          payload: { text: 'hola' },
          occurred_at: expect.any(Date),
        },
      });
    });

    it('ignora eventos duplicados (P2002)', async () => {
      const prismaError = { code: 'P2002', message: 'Unique constraint' };
      mockPrisma.event_history.create.mockRejectedValue(prismaError);

      await expect(service.registerEvent(EVENT_STUB)).resolves.toBeUndefined();
    });

    it('propaga otros errores de Prisma', async () => {
      const dbError = new Error('Connection lost');
      mockPrisma.event_history.create.mockRejectedValue(dbError);

      await expect(service.registerEvent(EVENT_STUB)).rejects.toThrow(
        'Connection lost',
      );
    });
  });
});
