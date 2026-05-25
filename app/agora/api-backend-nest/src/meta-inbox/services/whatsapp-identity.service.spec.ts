import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WhatsappIdentityService } from './whatsapp-identity.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { MESSAGE_GATEWAY } from '../../baileys/interfaces/message-gateway.interface';
import { ThreadEventService } from './thread-event.service';

describe('WhatsappIdentityService', () => {
  let service: WhatsappIdentityService;
  let prisma: { $queryRawUnsafe: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRawUnsafe: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappIdentityService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: MESSAGE_GATEWAY,
          useValue: { enviarMensajeWhatsApp: jest.fn() },
        },
        {
          provide: ThreadEventService,
          useValue: { recordThreadEvent: jest.fn() },
        },
      ],
    }).compile();
    service = module.get<WhatsappIdentityService>(WhatsappIdentityService);
  });

  // --- isWhatsappPnJid ---

  describe('isWhatsappPnJid', () => {
    it('returns true for @s.whatsapp.net suffix', () => {
      expect(service.isWhatsappPnJid('56912345678@s.whatsapp.net')).toBe(true);
    });

    it('returns true for @whatsapp.net suffix', () => {
      expect(service.isWhatsappPnJid('56912345678@whatsapp.net')).toBe(true);
    });

    it('returns false for @lid suffix', () => {
      expect(service.isWhatsappPnJid('12345678901234@lid')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(service.isWhatsappPnJid('56912345678@S.WHATSAPP.NET')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(service.isWhatsappPnJid('')).toBe(false);
    });
  });

  // --- isWhatsappLidJid ---

  describe('isWhatsappLidJid', () => {
    it('returns true for @lid suffix', () => {
      expect(service.isWhatsappLidJid('12345678901234@lid')).toBe(true);
    });

    it('returns true for @lid.c.us suffix', () => {
      expect(service.isWhatsappLidJid('12345678901234@lid.c.us')).toBe(true);
    });

    it('returns false for @s.whatsapp.net', () => {
      expect(service.isWhatsappLidJid('56912345678@s.whatsapp.net')).toBe(
        false,
      );
    });

    it('is case-insensitive', () => {
      expect(service.isWhatsappLidJid('12345678901234@LID')).toBe(true);
    });
  });

  // --- normalizeWhatsappPhone ---

  describe('normalizeWhatsappPhone', () => {
    it('strips non-digits and returns clean number', () => {
      expect(service.normalizeWhatsappPhone('+56 9 1234 5678')).toBe(
        '56912345678',
      );
    });

    it('accepts bare 11-digit number', () => {
      expect(service.normalizeWhatsappPhone('56912345678')).toBe('56912345678');
    });

    it('throws BadRequestException when input is empty', () => {
      expect(() => service.normalizeWhatsappPhone('')).toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when number is too short (< 8 digits)', () => {
      expect(() => service.normalizeWhatsappPhone('1234567')).toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when number is too long (> 15 digits)', () => {
      expect(() => service.normalizeWhatsappPhone('1234567890123456')).toThrow(
        BadRequestException,
      );
    });
  });

  // --- tryNormalizeWhatsappPhone ---

  describe('tryNormalizeWhatsappPhone', () => {
    it('returns digits for a valid phone with formatting', () => {
      expect(service.tryNormalizeWhatsappPhone('+56 9 1234 5678')).toBe(
        '56912345678',
      );
    });

    it('returns null for empty string', () => {
      expect(service.tryNormalizeWhatsappPhone('')).toBeNull();
    });

    it('returns null for too-short digit sequence', () => {
      expect(service.tryNormalizeWhatsappPhone('1234567')).toBeNull();
    });

    it('returns null for too-long digit sequence', () => {
      expect(service.tryNormalizeWhatsappPhone('1234567890123456')).toBeNull();
    });

    it('returns null for null input', () => {
      expect(service.tryNormalizeWhatsappPhone(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(service.tryNormalizeWhatsappPhone(undefined)).toBeNull();
    });
  });

  // --- extractPhoneFromWhatsappJid ---

  describe('extractPhoneFromWhatsappJid', () => {
    it('extracts phone from pnJid format', () => {
      expect(
        service.extractPhoneFromWhatsappJid('56912345678@s.whatsapp.net'),
      ).toBe('56912345678');
    });

    it('extracts phone from bare 11-digit number', () => {
      expect(service.extractPhoneFromWhatsappJid('56912345678')).toBe(
        '56912345678',
      );
    });

    it('returns null for @lid JID (letters after @)', () => {
      expect(service.extractPhoneFromWhatsappJid('12345@lid')).toBeNull();
    });

    it('returns null for non-string input', () => {
      expect(service.extractPhoneFromWhatsappJid(null)).toBeNull();
      expect(service.extractPhoneFromWhatsappJid(42)).toBeNull();
    });

    it('returns null for short number not matching pattern', () => {
      expect(
        service.extractPhoneFromWhatsappJid('123@s.whatsapp.net'),
      ).toBeNull();
    });
  });

  // --- firstNonEmptyString ---

  describe('firstNonEmptyString', () => {
    it('returns the first non-empty trimmed string', () => {
      expect(
        service.firstNonEmptyString([null, '', '  ', 'hello', 'world']),
      ).toBe('hello');
    });

    it('returns null when all values are empty or non-string', () => {
      expect(service.firstNonEmptyString([null, undefined, '', 42])).toBeNull();
    });

    it('applies predicate to filter candidates', () => {
      const result = service.firstNonEmptyString(
        ['56912345678@s.whatsapp.net', '12345678901234@lid'],
        (v) => service.isWhatsappLidJid(v),
      );
      expect(result).toBe('12345678901234@lid');
    });

    it('returns null when no value satisfies the predicate', () => {
      const result = service.firstNonEmptyString(
        ['56912345678@s.whatsapp.net'],
        (v) => service.isWhatsappLidJid(v),
      );
      expect(result).toBeNull();
    });

    it('returns first match when no predicate given', () => {
      expect(service.firstNonEmptyString(['a', 'b'])).toBe('a');
    });
  });

  // --- resolveWhatsappIdentity ---

  describe('resolveWhatsappIdentity', () => {
    it('resolves identity using pnJid from contact metadata', async () => {
      // When sessionId is empty the thread query is skipped entirely.
      // Call order: 1) contact query, 2) message query.
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            actorExternalId: '56912345678@s.whatsapp.net',
            phone: '56912345678',
            displayName: 'Test User',
            metadata: { wa: { pnJid: '56912345678@s.whatsapp.net' } },
          },
        ]) // contact query
        .mockResolvedValueOnce([]); // message query

      const result = await service.resolveWhatsappIdentity({
        phone: '56912345678',
      });

      expect(result.phone).toBe('56912345678');
      expect(result.pnJid).toBe('56912345678@s.whatsapp.net');
      expect(result.displayName).toBe('Test User');
    });

    it('returns null fields when identity cannot be resolved', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);

      const result = await service.resolveWhatsappIdentity({});

      expect(result.actorExternalId).toBeNull();
      expect(result.phone).toBeNull();
      expect(result.pnJid).toBeNull();
    });

    it('resolves lidJid from message contentJson', async () => {
      // No sessionId → thread query skipped. Call order: 1) contact, 2) message.
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([]) // contact query → no contact
        .mockResolvedValueOnce([
          {
            contentJson: {
              wa: {
                pnJid: '56912345678@s.whatsapp.net',
                lidJid: '12345678901234@lid',
              },
            },
          },
        ]); // message query

      const result = await service.resolveWhatsappIdentity({
        actorExternalId: '56912345678@s.whatsapp.net',
      });

      expect(result.pnJid).toBe('56912345678@s.whatsapp.net');
      expect(result.lidJid).toBe('12345678901234@lid');
      expect(result.hasLidMapping).toBe(true);
    });

    it('sets source flags correctly', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            sessionId: 'sess1',
            actorExternalId: '56912345678@s.whatsapp.net',
            metadata: {},
          },
        ])
        .mockResolvedValueOnce([
          {
            actorExternalId: '56912345678@s.whatsapp.net',
            phone: '56912345678',
            displayName: 'X',
            metadata: {},
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.resolveWhatsappIdentity({
        sessionId: 'sess1',
      });

      expect(result.source.thread).toBe(true);
      expect(result.source.contact).toBe(true);
      expect(result.source.message).toBe(false);
    });
  });
});
