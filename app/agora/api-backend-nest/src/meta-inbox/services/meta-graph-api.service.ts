import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import axios from 'axios';
import { getRuntimeSecret } from '../../shared/runtime-secrets';
import { IMetaGraphApiGateway, ThreadMessageMediaType } from '../interfaces/meta-graph-api-gateway.interface';

@Injectable()
export class MetaGraphApiService implements IMetaGraphApiGateway {
  private readonly logger = new Logger(MetaGraphApiService.name);

  isInstagramThread(objectType: string, sourceChannel: string | null): boolean {
    const normalizedObjectType = (objectType || '').toUpperCase();
    const normalizedSource = (sourceChannel || '').toLowerCase();
    return (
      normalizedObjectType.includes('INSTAGRAM') ||
      normalizedObjectType.includes('IG') ||
      normalizedSource.includes('instagram') ||
      normalizedSource.includes('ig')
    );
  }

  async resolveSendTransport(
    objectType: string,
    sourceChannel: string | null,
  ): Promise<{ graphUrl: string; accessToken: string }> {
    if ((objectType || '').toUpperCase() === 'WHATSAPP') {
      throw new BadRequestException('whatsapp_sender_not_configured');
    }
    const isInstagram = this.isInstagramThread(objectType, sourceChannel);
    const accessToken = await this.resolveAccessToken(objectType, sourceChannel);
    return {
      graphUrl: isInstagram
        ? 'https://graph.instagram.com/v21.0/me/messages'
        : 'https://graph.facebook.com/v21.0/me/messages',
      accessToken,
    };
  }

  resolveGraphAttachmentType(
    mediaType: ThreadMessageMediaType,
    thread: { objectType: string; sourceChannel: string | null },
  ): 'image' | 'audio' | 'video' | 'file' {
    if (mediaType === 'document' && this.isInstagramThread(thread.objectType, thread.sourceChannel)) {
      throw new BadRequestException('document_not_supported_for_instagram');
    }
    if (mediaType === 'document') return 'file';
    return mediaType;
  }

  async postToGraphWithFallback(
    thread: { objectType: string; sourceChannel: string | null },
    body: any,
    primary: { graphUrl: string; accessToken: string },
  ): Promise<any> {
    try {
      return await axios.post(primary.graphUrl, body, {
        headers: { Authorization: `Bearer ${primary.accessToken}`, 'Content-Type': 'application/json' },
        timeout: 15000,
      });
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      const subcode = err?.response?.data?.error?.error_subcode;
      const graphMessage = err?.response?.data?.error?.message;
      this.logger.warn(
        `sendGraph failed host=${primary.graphUrl} objectType=${thread.objectType} sourceChannel=${thread.sourceChannel ?? '-'} code=${code ?? 'unknown'} subcode=${subcode ?? 'unknown'}`,
      );
      if (code === 100 && subcode === 2534080) {
        throw new BadRequestException(
          `Formato de audio no soportado por Instagram API. ${graphMessage ?? ''}`.trim(),
        );
      }
      throw err;
    }
  }

  private async resolveAccessToken(objectType: string, sourceChannel: string | null): Promise<string> {
    if (this.isInstagramThread(objectType, sourceChannel)) {
      const igToken = await getRuntimeSecret('META_INSTAGRAM_ACCESS_TOKEN');
      if (!igToken) throw new InternalServerErrorException('missing_env:META_INSTAGRAM_ACCESS_TOKEN');
      return igToken;
    }
    const pageToken = await getRuntimeSecret('META_PAGE_ACCESS_TOKEN');
    if (!pageToken) throw new InternalServerErrorException('missing_env:META_PAGE_ACCESS_TOKEN');
    return pageToken;
  }
}
