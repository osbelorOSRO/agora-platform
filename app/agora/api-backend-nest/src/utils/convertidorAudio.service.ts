import { execFile } from 'child_process';
import fs from 'fs';
import util from 'util';
import { Logger } from '@nestjs/common';

const logger = new Logger('ConvertidorAudio');

const execFilePromise = util.promisify(execFile);

export async function convertirWebmAOgg(
  rutaOriginal: string,
): Promise<string | null> {
  const rutaOgg = rutaOriginal.replace(/\.webm$/, '_wa.ogg');

  try {
    const { stdout: _stdout, stderr } = await execFilePromise('ffmpeg', [
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
    logger.debug(`Conversión completa${stderr ? ` stderr: ${stderr}` : ''}`);

    if (fs.existsSync(rutaOgg)) {
      fs.unlinkSync(rutaOriginal);
      return rutaOgg;
    } else {
      logger.error('Conversión fallida: no se generó archivo .ogg');
      return null;
    }
  } catch (error: any) {
    logger.error(`Error FFMPEG: ${error.message}`);
    return null;
  }
}
