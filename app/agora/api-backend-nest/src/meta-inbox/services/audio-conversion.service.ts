import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { removeFileQuietly } from '../../media/media-security';

@Injectable()
export class AudioConversionService {
  private readonly logger = new Logger(AudioConversionService.name);
  private readonly execFilePromise = util.promisify(execFile);

  /** Converts an audio file to AAC/m4a for Instagram compatibility.
   *  Removes inputPath on success (consumed). Caller is responsible for removing outputPath after use. */
  async convertToM4a(inputPath: string): Promise<{ outputPath: string; outputName: string; mimeType: 'audio/mp4' }> {
    const outputPath = inputPath.replace(/\.[^/.]+$/, '_ig.m4a');
    const outputName = path.basename(outputPath);

    try {
      await this.execFilePromise('ffmpeg', [
        '-i', inputPath, '-c:a', 'aac', '-b:a', '64k', '-ar', '44100', '-ac', '1', outputPath, '-y',
      ]);
      if (!fs.existsSync(outputPath)) throw new InternalServerErrorException('ffmpeg_output_missing');
      removeFileQuietly(inputPath);
      return { outputPath, outputName, mimeType: 'audio/mp4' };
    } catch (error: any) {
      removeFileQuietly(inputPath);
      removeFileQuietly(outputPath);
      this.logger.warn(`audio conversion failed for IG: ${error?.message ?? 'unknown_error'}`);
      throw new BadRequestException('No se pudo convertir el audio a formato compatible para Instagram (m4a).');
    }
  }
}
