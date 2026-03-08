import { exec } from 'child_process';
import fs from 'fs';
import util from 'util';
import path from 'path';

const execPromise = util.promisify(exec);

export async function convertirWebmAOgg(rutaOriginal: string): Promise<string | null> {
  const rutaOgg = rutaOriginal.replace(/\.webm$/, '_wa.ogg');

  try {
    const cmd = `ffmpeg -i "${rutaOriginal}" -c:a libopus -b:a 32k -ar 48000 -ac 1 -vn "${rutaOgg}" -y`;
    const { stdout, stderr } = await execPromise(cmd);
    console.log('🎙️ Conversión completa:\n', stdout, stderr);

    if (fs.existsSync(rutaOgg)) {
      fs.unlinkSync(rutaOriginal);
      return rutaOgg;
    } else {
      console.error('❌ Conversión fallida. No se generó archivo .ogg');
      return null;
    }
  } catch (error: any) {
    console.error('❌ Error FFMPEG:', error.message);
    return null;
  }
}
