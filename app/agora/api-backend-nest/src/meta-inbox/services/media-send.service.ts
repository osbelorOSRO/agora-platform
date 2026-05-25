import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ensureCanonicalExtension,
  removeFileQuietly,
  validateStoredMediaFile,
} from '../../media/media-security';
import { IMinioGateway, MINIO_GATEWAY } from '../../minio/interfaces/minio-gateway.interface';
import { IThreadGateway, THREAD_GATEWAY } from '../interfaces/thread-gateway.interface';
import { IMetaGraphApiGateway, META_GRAPH_GATEWAY, ThreadMessageMediaType } from '../interfaces/meta-graph-api-gateway.interface';
import { AudioConversionService } from './audio-conversion.service';

@Injectable()
export class MediaSendService {
  constructor(
    @Inject(MINIO_GATEWAY) private readonly minio: IMinioGateway,
    private readonly audioConversion: AudioConversionService,
    @Inject(THREAD_GATEWAY) private readonly thread: IThreadGateway,
    @Inject(META_GRAPH_GATEWAY) private readonly metaGraph: IMetaGraphApiGateway,
  ) {}

  async prepareMediaUpload(
    file: Express.Multer.File,
    sessionId: string,
  ): Promise<{ url: string; mimeType: string; mediaType: ThreadMessageMediaType; fileName: string }> {
    const threadIdentity = await this.thread.getThreadIdentity(sessionId);
    if (!threadIdentity) throw new NotFoundException(`session_not_found:${sessionId}`);

    const isInstagram = this.metaGraph.isInstagramThread(threadIdentity.objectType, threadIdentity.sourceChannel);
    const detected = await validateStoredMediaFile(file, ['image', 'audio', 'video', 'document']);
    const mediaType = detected.family as ThreadMessageMediaType;
    ensureCanonicalExtension(file, detected);

    const prepared = await this.prepareAndUpload(file, { isInstagram, mediaType, mimeType: detected.mimeType });
    return { url: prepared.url, mimeType: prepared.mimeType, mediaType, fileName: file.filename };
  }

  private async prepareAndUpload(
    file: Express.Multer.File,
    input: { isInstagram: boolean; mediaType: ThreadMessageMediaType; mimeType: string },
  ): Promise<{ url: string; mimeType: string }> {
    if (!input.isInstagram || input.mediaType !== 'audio') {
      const url = await this.minio.uploadFile(file.path, file.filename, input.mimeType);
      removeFileQuietly(file.path);
      return { url, mimeType: input.mimeType };
    }

    const converted = await this.audioConversion.convertToM4a(file.path);
    try {
      const url = await this.minio.uploadFile(converted.outputPath, converted.outputName, converted.mimeType);
      removeFileQuietly(converted.outputPath);
      return { url, mimeType: converted.mimeType };
    } catch (error) {
      removeFileQuietly(converted.outputPath);
      throw error;
    }
  }
}
