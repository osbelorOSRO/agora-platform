import { BadRequestException } from '@nestjs/common';
import { BaileysIngressService } from './baileys-ingress.service';

const makeQueue = () => ({ add: jest.fn().mockResolvedValue({ id: '1' }) });

const validEnvelope = () => ({
  externalEventId: 'event:123',
  actorExternalId: 'actor:456',
  eventType: 'message',
  occurredAt: '2026-05-01T10:00:00.000Z',
  payload: { text: 'Hola', platform: 'whatsapp' },
});

const makeSvc = () => new BaileysIngressService(makeQueue() as any);

describe('BaileysIngressService', () => {
  describe('ingestEnvelope — happy path', () => {
    it('acepta un envelope válido y retorna accepted: true', async () => {
      const svc = makeSvc();
      const result = await svc.ingestEnvelope(validEnvelope());
      expect(result.accepted).toBe(true);
      expect(result.externalEventId).toBe('event:123');
    });

    it('encola el mensaje con jobId basado en externalEventId', async () => {
      const queue = makeQueue();
      const svc = new BaileysIngressService(queue as any);
      await svc.ingestEnvelope(validEnvelope());
      expect(queue.add).toHaveBeenCalledWith(
        'baileys.message',
        expect.objectContaining({ externalEventId: 'event:123' }),
        expect.objectContaining({ jobId: 'event_123' }),
      );
    });

    it('normaliza el envelope con provider=BAILEYS y objectType=WHATSAPP', async () => {
      const queue = makeQueue();
      const svc = new BaileysIngressService(queue as any);
      await svc.ingestEnvelope(validEnvelope());
      const enqueued = (queue.add as jest.Mock).mock.calls[0][1];
      expect(enqueued.provider).toBe('BAILEYS');
      expect(enqueued.objectType).toBe('WHATSAPP');
      expect(enqueued.pipeline).toBe('MESSAGES');
    });

    it('usa receivedAt del envelope si se provee', async () => {
      const queue = makeQueue();
      const svc = new BaileysIngressService(queue as any);
      const env = {
        ...validEnvelope(),
        receivedAt: '2026-05-01T09:00:00.000Z',
      };
      await svc.ingestEnvelope(env);
      const enqueued = (queue.add as jest.Mock).mock.calls[0][1];
      expect(enqueued.receivedAt).toBe('2026-05-01T09:00:00.000Z');
    });

    it('agrega platform=whatsapp si payload no lo tiene', async () => {
      const queue = makeQueue();
      const svc = new BaileysIngressService(queue as any);
      const env = { ...validEnvelope(), payload: { text: 'Hola' } };
      await svc.ingestEnvelope(env);
      const enqueued = (queue.add as jest.Mock).mock.calls[0][1];
      expect(enqueued.payload.platform).toBe('whatsapp');
    });
  });

  describe('ingestEnvelope — validaciones', () => {
    it('lanza BadRequestException si falta externalEventId', async () => {
      const svc = makeSvc();
      const env = { ...validEnvelope(), externalEventId: undefined };
      await expect(svc.ingestEnvelope(env)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si falta actorExternalId', async () => {
      const svc = makeSvc();
      const env = { ...validEnvelope(), actorExternalId: '' };
      await expect(svc.ingestEnvelope(env)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si occurredAt no es fecha válida', async () => {
      const svc = makeSvc();
      const env = { ...validEnvelope(), occurredAt: 'no-es-fecha' };
      await expect(svc.ingestEnvelope(env)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si payload es un array', async () => {
      const svc = makeSvc();
      const env = { ...validEnvelope(), payload: [1, 2, 3] };
      await expect(svc.ingestEnvelope(env)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si payload es null', async () => {
      const svc = makeSvc();
      const env = { ...validEnvelope(), payload: null };
      await expect(svc.ingestEnvelope(env)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
