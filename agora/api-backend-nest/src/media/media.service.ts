import { Injectable } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { exec } from 'child_process';

const execPromise = util.promisify(exec);
const MEDIA_BASE_URL = (process.env.MEDIA_BASE_URL || 'http://localhost:4001').replace(/\/+$/, '');

@Injectable()
export class MediaService {

  // 🔹 EXISTENTE (NO SE MODIFICA)
  async procesarArchivo(
    archivo: Express.Multer.File,
    cliente_id: string,
    tipo: string,
  ) {
    const ruta = `/uploads/${archivo.filename}`;

    return {
      mensaje: 'Archivo guardado correctamente',
      ruta,
      nombre_original: archivo.originalname,
      cliente_id,
      tipo,
    };
  }

  // 🔹 NUEVO MÉTODO PARA TTS → CONVERSIÓN A NOTA DE VOZ
  async procesarTts(archivo: Express.Multer.File) {
    const rutaOriginal = archivo.path;

    const rutaOgg = rutaOriginal.replace(path.extname(rutaOriginal), '_wa.ogg');

    const cmd = `ffmpeg -i "${rutaOriginal}" -c:a libopus -b:a 32k -ar 48000 -ac 1 -vn "${rutaOgg}" -y`;

    await execPromise(cmd);

    if (!fs.existsSync(rutaOgg)) {
      throw new Error('Error convirtiendo audio a formato WhatsApp');
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
