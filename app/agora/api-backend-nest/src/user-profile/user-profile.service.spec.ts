import { BadRequestException } from '@nestjs/common';
import { UserProfileService } from './user-profile.service';
import { PrismaService } from '../database/prisma/prisma.service';

jest.mock('../media/media-security', () => ({
  validateStoredMediaFile: jest.fn(),
  removeFileQuietly: jest.fn(),
}));

import {
  validateStoredMediaFile,
  removeFileQuietly,
} from '../media/media-security';

const mockValidate = validateStoredMediaFile as jest.Mock;
const mockRemove = removeFileQuietly as jest.Mock;

function buildService(
  overrides: {
    queryRaw?: jest.Mock;
    executeRaw?: jest.Mock;
    uploadFile?: jest.Mock;
  } = {},
) {
  const mockPrisma = {
    $queryRaw: overrides.queryRaw ?? jest.fn(),
    $executeRaw: overrides.executeRaw ?? jest.fn().mockResolvedValue(1),
  } as unknown as PrismaService;

  const mockMinio = {
    uploadFile: overrides.uploadFile ?? jest.fn(),
  };

  const svc = new UserProfileService(mockPrisma, mockMinio as any);
  return { svc, mockPrisma, mockMinio };
}

function fakeFile(path = '/tmp/test.jpg'): Express.Multer.File {
  return {
    path,
    filename: 'test.jpg',
    fieldname: 'photo',
    originalname: 'photo.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    destination: '/tmp',
    buffer: Buffer.alloc(0),
    stream: null as any,
  };
}

describe('UserProfileService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ─── getPhotoUrl ──────────────────────────────────────────────────────────

  describe('getPhotoUrl', () => {
    it('devuelve la URL cuando existe', async () => {
      const { svc } = buildService({
        queryRaw: jest
          .fn()
          .mockResolvedValue([{ photo_url: 'https://cdn/foto.jpg' }]),
      });
      const result = await svc.getPhotoUrl(1);
      expect(result).toBe('https://cdn/foto.jpg');
    });

    it('devuelve null cuando el usuario no tiene foto', async () => {
      const { svc } = buildService({
        queryRaw: jest.fn().mockResolvedValue([{ photo_url: null }]),
      });
      const result = await svc.getPhotoUrl(1);
      expect(result).toBeNull();
    });

    it('devuelve null cuando no hay filas', async () => {
      const { svc } = buildService({
        queryRaw: jest.fn().mockResolvedValue([]),
      });
      const result = await svc.getPhotoUrl(99);
      expect(result).toBeNull();
    });
  });

  // ─── uploadPhoto ──────────────────────────────────────────────────────────

  describe('uploadPhoto', () => {
    const detected = {
      family: 'image' as const,
      mimeType: 'image/jpeg',
      extension: 'jpg',
    };

    it('sube la foto y retorna la URL', async () => {
      mockValidate.mockResolvedValue(detected);
      const { svc, mockMinio } = buildService({
        uploadFile: jest.fn().mockResolvedValue('https://cdn/profile/uuid.jpg'),
      });

      const result = await svc.uploadPhoto(1, fakeFile());

      expect(result).toBe('https://cdn/profile/uuid.jpg');
      expect(mockMinio.uploadFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/^profile\/.+\.jpg$/),
        'image/jpeg',
      );
    });

    it('limpia el archivo y propaga el error si validateStoredMediaFile lanza', async () => {
      mockValidate.mockRejectedValue(new BadRequestException('Tipo inválido'));
      const { svc } = buildService();
      const file = fakeFile('/tmp/bad.bin');

      await expect(svc.uploadPhoto(1, file)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRemove).toHaveBeenCalledWith('/tmp/bad.bin');
    });

    it('limpia el archivo incluso si minio falla', async () => {
      mockValidate.mockResolvedValue(detected);
      const { svc } = buildService({
        uploadFile: jest.fn().mockRejectedValue(new Error('MinIO error')),
      });
      const file = fakeFile('/tmp/img.jpg');

      await expect(svc.uploadPhoto(1, file)).rejects.toThrow('MinIO error');
      expect(mockRemove).toHaveBeenCalledWith('/tmp/img.jpg');
    });

    it('lanza BadRequestException si minio devuelve URL vacía', async () => {
      mockValidate.mockResolvedValue(detected);
      const { svc } = buildService({
        uploadFile: jest.fn().mockResolvedValue(null),
      });

      await expect(svc.uploadPhoto(1, fakeFile())).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── removePhoto ──────────────────────────────────────────────────────────

  describe('removePhoto', () => {
    it('ejecuta UPDATE para poner photo_url a NULL', async () => {
      const executeRaw = jest.fn().mockResolvedValue(1);
      const { svc } = buildService({ executeRaw });

      await svc.removePhoto(5);

      expect(executeRaw).toHaveBeenCalledTimes(1);
    });
  });
});
