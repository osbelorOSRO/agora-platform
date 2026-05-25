import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from 'minio';
import fs from 'fs';
import { IMinioGateway } from './interfaces/minio-gateway.interface';

@Injectable()
export class MinioService implements OnModuleInit, IMinioGateway {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Client;
  private readonly bucket: string;
  private readonly publicBase: string;

  constructor() {
    const endpoint = process.env.MINIO_ENDPOINT || '';
    const port = parseInt(process.env.MINIO_PORT || '9000', 10);
    const useSSL = process.env.MINIO_USE_SSL === 'true';

    this.bucket = process.env.MINIO_BUCKET || 'agora-media';
    this.publicBase = (
      process.env.MEDIA_BASE_URL || `http://${endpoint}:${port}`
    ).replace(/\/+$/, '');

    this.client = new Client({
      endPoint: endpoint,
      port,
      useSSL,
      accessKey: process.env.MINIO_ACCESS_KEY || '',
      secretKey: process.env.MINIO_SECRET_KEY || '',
    });
  }

  async onModuleInit() {
    try {
      await this.client.bucketExists(this.bucket);
      this.logger.log(`✅ MinIO conectado — bucket: ${this.bucket}`);
    } catch (err: any) {
      this.logger.error(`⚠️ MinIO no disponible: ${err?.message}`);
    }
  }

  async uploadFile(
    filePath: string,
    filename: string,
    mimeType: string,
  ): Promise<string> {
    const stream = fs.createReadStream(filePath);
    const { size } = fs.statSync(filePath);
    await this.client.putObject(this.bucket, filename, stream, size, {
      'Content-Type': mimeType,
    });
    return `${this.publicBase}/${this.bucket}/${filename}`;
  }
}
