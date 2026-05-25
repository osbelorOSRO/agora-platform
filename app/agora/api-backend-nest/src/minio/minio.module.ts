import { Global, Module } from '@nestjs/common';
import { MinioService } from './minio.service';
import { MINIO_GATEWAY } from './interfaces/minio-gateway.interface';

@Global()
@Module({
  providers: [
    MinioService,
    { provide: MINIO_GATEWAY, useExisting: MinioService },
  ],
  exports: [MinioService, MINIO_GATEWAY],
})
export class MinioModule {}
