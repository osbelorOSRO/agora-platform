import axios from 'axios';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FcaApi = any;

export class SendMessageUseCase {
  constructor(private readonly api: FcaApi) {}

  async execute(threadID: string, text: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.api.sendMessage(text, threadID, (err: unknown, info: unknown) => {
        if (err) reject(err);
        else resolve(info);
      });
    });
  }

  async executeWithAttachment(
    threadID: string,
    mediaUrl: string,
    caption?: string,
  ): Promise<unknown> {
    const streamResponse = await axios({ method: 'GET', url: mediaUrl, responseType: 'stream' });
    const attachment = streamResponse.data;

    const result = await new Promise((resolve, reject) => {
      this.api.sendMessage({ attachment }, threadID, (err: unknown, info: unknown) => {
        if (err) reject(err);
        else resolve(info);
      });
    });

    if (caption) {
      await new Promise((resolve, reject) => {
        this.api.sendMessage(caption, threadID, (err: unknown, info: unknown) => {
          if (err) reject(err);
          else resolve(info);
        });
      });
    }

    return result;
  }
}
