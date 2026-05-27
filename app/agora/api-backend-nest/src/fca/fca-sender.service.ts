import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class FcaSenderService {
  private readonly logger = new Logger(FcaSenderService.name);

  private getGatewayUrl(): string {
    const url = process.env.FCA_BACKEND_URL;
    if (!url) throw new Error('Missing required env FCA_BACKEND_URL');
    return url;
  }

  async sendAttachment(
    threadID: string,
    mediaUrl: string,
    caption?: string,
  ): Promise<unknown> {
    const gatewayUrl = this.getGatewayUrl();
    const internalToken = process.env.FCA_INTERNAL_TOKEN;
    if (!internalToken)
      throw new InternalServerErrorException(
        'Missing required env FCA_INTERNAL_TOKEN',
      );

    try {
      const response = await axios.post(
        `${gatewayUrl}/enviar-adjunto`,
        { threadID, mediaUrl, caption },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-internal-token': internalToken,
          },
          timeout: 30000,
        },
      );
      this.logger.log(`Adjunto FCA enviado threadID=${threadID}`);
      return response.data;
    } catch (error: unknown) {
      const err = error as { message: string; response?: { status: number } };
      this.logger.error(`Error al enviar adjunto FCA: ${err.message}`, {
        threadID,
        status: err.response?.status,
      });
      throw new InternalServerErrorException(
        'No se pudo enviar el adjunto por Facebook',
      );
    }
  }

  async sendMessage(threadID: string, text: string): Promise<unknown> {
    const gatewayUrl = this.getGatewayUrl();
    const endpoint = `${gatewayUrl}/enviar-mensaje`;

    const internalToken = process.env.FCA_INTERNAL_TOKEN;
    if (!internalToken) {
      throw new InternalServerErrorException(
        'Missing required env FCA_INTERNAL_TOKEN',
      );
    }

    try {
      const response = await axios.post(
        endpoint,
        { threadID, text },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-internal-token': internalToken,
          },
          timeout: 10000,
        },
      );

      this.logger.log(`Mensaje FCA enviado threadID=${threadID}`);
      return response.data;
    } catch (error: unknown) {
      const err = error as { message: string; response?: { status: number } };
      this.logger.error(`Error al enviar mensaje FCA: ${err.message}`, {
        endpoint,
        status: err.response?.status,
      });
      throw new InternalServerErrorException(
        'No se pudo enviar el mensaje por Facebook',
      );
    }
  }
}
