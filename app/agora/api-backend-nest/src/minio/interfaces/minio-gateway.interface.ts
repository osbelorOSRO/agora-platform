export const MINIO_GATEWAY = Symbol('MINIO_GATEWAY');

export interface IMinioGateway {
  uploadFile(
    filePath: string,
    filename: string,
    mimeType: string,
  ): Promise<string>;

  uploadFileToBucket(
    filePath: string,
    filename: string,
    mimeType: string,
    bucket: string,
  ): Promise<string>;
}
