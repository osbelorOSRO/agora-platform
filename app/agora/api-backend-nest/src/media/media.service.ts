import {
  Inject,
  Injectable,
  InternalServerErrorException,
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

const execFilePromise = util.promisify(execFile);

@Injectable()
export class MediaService {
  constructor(@Inject(MINIO_GATEWAY) private readonly minio: IMinioGateway) {}

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

    return {
      mensaje: 'TTS convertido correctamente',
      url,
    };
  }
}
