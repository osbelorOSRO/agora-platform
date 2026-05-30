import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { execFile } from 'child_process';
import {
  ensureCanonicalExtension,
  familiesForTipo,
  removeFileQuietly,
  validateStoredMediaFile,
} from './media-security';
import {
  IMinioGateway,
  MINIO_GATEWAY,
} from '../minio/interfaces/minio-gateway.interface';
import { PrismaService } from '../database/prisma/prisma.service';

const execFilePromise = util.promisify(execFile);
const OFERTAS_BUCKET = 'ofertas';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @Inject(MINIO_GATEWAY) private readonly minio: IMinioGateway,
    private readonly prisma: PrismaService,
  ) {}

  async procesarArchivo(
    archivo: Express.Multer.File,
    actorId: string,
    tipo: string,
  ) {
    const detected = await validateStoredMediaFile(
      archivo,
      familiesForTipo(tipo),
    );
    ensureCanonicalExtension(archivo, detected);

    const url = await this.minio.uploadFile(
      archivo.path,
      archivo.filename,
      detected.mimeType,
    );
    removeFileQuietly(archivo.path);

    return {
      mensaje: 'Archivo guardado correctamente',
      url,
      nombre_original: archivo.originalname,
      mimeType: detected.mimeType,
      actorId,
      tipo,
    };
  }

  async procesarTts(archivo: Express.Multer.File) {
    const detected = await validateStoredMediaFile(archivo, ['audio', 'video']);
    ensureCanonicalExtension(archivo, detected);

    const rutaOriginal = archivo.path;
    const rutaOgg = rutaOriginal.replace(path.extname(rutaOriginal), '_wa.ogg');
    const nombreFinal = path.basename(rutaOgg);

    try {
      await execFilePromise('ffmpeg', [
        '-i',
        rutaOriginal,
        '-c:a',
        'libopus',
        '-b:a',
        '32k',
        '-ar',
        '48000',
        '-ac',
        '1',
        '-vn',
        rutaOgg,
        '-y',
      ]);

      if (!fs.existsSync(rutaOgg)) {
        throw new InternalServerErrorException(
          'Error convirtiendo audio a formato WhatsApp',
        );
      }
    } catch (error) {
      removeFileQuietly(rutaOriginal);
      removeFileQuietly(rutaOgg);
      throw error;
    }

    removeFileQuietly(rutaOriginal);

    const url = await this.minio.uploadFile(rutaOgg, nombreFinal, 'audio/ogg');
    removeFileQuietly(rutaOgg);

    return { mensaje: 'TTS convertido correctamente', url };
  }

  // ── Galería de imágenes de ofertas ────────────────────────────────────────

  async listarGaleria() {
    return this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT id, nombre, url, mime_type, size_bytes, created_at
       FROM galeria_imagenes_ofertas
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC`,
    );
  }

  async subirGaleria(archivos: Express.Multer.File[]) {
    const resultados: Record<string, unknown>[] = [];

    for (const archivo of archivos) {
      try {
        const detected = await validateStoredMediaFile(archivo, ['image']);
        ensureCanonicalExtension(archivo, detected);

        const url = await this.minio.uploadFileToBucket(
          archivo.path,
          archivo.filename,
          detected.mimeType,
          OFERTAS_BUCKET,
        );
        removeFileQuietly(archivo.path);

        const rows = await this.prisma.$queryRawUnsafe<
          Record<string, unknown>[]
        >(
          `INSERT INTO galeria_imagenes_ofertas (nombre, url, bucket, mime_type, size_bytes, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           RETURNING id, nombre, url, mime_type, size_bytes, created_at`,
          archivo.originalname,
          url,
          OFERTAS_BUCKET,
          detected.mimeType,
          archivo.size,
        );
        resultados.push(rows[0]);
      } catch (e: unknown) {
        this.logger.error(
          `Error subiendo imagen ${archivo.originalname}: ${e instanceof Error ? e.message : String(e)}`,
        );
        removeFileQuietly(archivo.path);
      }
    }

    return resultados;
  }

  async eliminarGaleria(id: number) {
    const rows = await this.prisma.$queryRawUnsafe<{ id: number }[]>(
      `SELECT id FROM galeria_imagenes_ofertas WHERE id = $1 AND deleted_at IS NULL`,
      id,
    );
    if (!rows[0]) throw new NotFoundException(`Imagen ${id} no encontrada`);

    await this.prisma.$queryRawUnsafe(
      `UPDATE galeria_imagenes_ofertas SET deleted_at = NOW() WHERE id = $1`,
      id,
    );
    return { id, deleted: true };
  }
}
