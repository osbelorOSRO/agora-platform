import { Injectable } from '@nestjs/common';
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

const execFilePromise = util.promisify(execFile);
const MEDIA_BASE_URL = (process.env.MEDIA_BASE_URL || '').replace(/\/+$/, '');

@Injectable()
export class MediaService {

  async procesarArchivo(
    archivo: Express.Multer.File,
    actorId: string,
    tipo: string,
  ) {
    const detected = await validateStoredMediaFile(archivo, familiesForTipo(tipo));
    ensureCanonicalExtension(archivo, detected);

    const ruta = `/uploads/${archivo.filename}`;

    return {
      mensaje: 'Archivo guardado correctamente',
      ruta,
      nombre_original: archivo.originalname,
      mimeType: detected.mimeType,
      actorId,
      tipo,
    };
  }

  // 🔹 NUEVO MÉTODO PARA TTS → CONVERSIÓN A NOTA DE VOZ
  async procesarTts(archivo: Express.Multer.File) {
    const detected = await validateStoredMediaFile(archivo, ['audio', 'video']);
    ensureCanonicalExtension(archivo, detected);

    const rutaOriginal = archivo.path;
    const rutaOgg = rutaOriginal.replace(path.extname(rutaOriginal), '_wa.ogg');

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
        throw new Error('Error convirtiendo audio a formato WhatsApp');
      }
    } catch (error) {
      removeFileQuietly(rutaOriginal);
      removeFileQuietly(rutaOgg);
      throw error;
    }

    // eliminar mp3 original
    fs.unlinkSync(rutaOriginal);

    const nombreFinal = path.basename(rutaOgg);

    return {
      mensaje: 'TTS convertido correctamente',
      url: `${MEDIA_BASE_URL}/uploads/${nombreFinal}`,
    };
  }
}
