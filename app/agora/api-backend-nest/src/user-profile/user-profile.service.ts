import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { validateStoredMediaFile, removeFileQuietly } from '../media/media-security';
import { randomUUID } from 'crypto';
import path from 'path';

@Injectable()
export class UserProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async getPhotoUrl(userId: number): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<{ photo_url: string | null }[]>`
      SELECT photo_url FROM usuarios WHERE id = ${userId} LIMIT 1
    `;
    return rows[0]?.photo_url ?? null;
  }

  async uploadPhoto(userId: number, file: Express.Multer.File): Promise<string> {
    let detected;
    try {
      detected = await validateStoredMediaFile(file, ['image']);
    } catch (err) {
      removeFileQuietly(file.path);
      throw err;
    }

    const ext = detected.extension;
    const filename = `profile/${randomUUID()}.${ext}`;

    let photoUrl: string;
    try {
      photoUrl = await this.minio.uploadFile(file.path, filename, detected.mimeType);
    } finally {
      removeFileQuietly(file.path);
    }

    if (!photoUrl) throw new BadRequestException('Error al subir la imagen');

    await this.prisma.$executeRaw`
      UPDATE usuarios SET photo_url = ${photoUrl} WHERE id = ${userId}
    `;

    return photoUrl;
  }

  async removePhoto(userId: number): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE usuarios SET photo_url = NULL WHERE id = ${userId}
    `;
  }
}
