export const META_GRAPH_GATEWAY = Symbol('META_GRAPH_GATEWAY');

export type ThreadMessageMediaType = 'image' | 'audio' | 'document' | 'video';

export interface IMetaGraphApiGateway {
  isInstagramThread(objectType: string, sourceChannel: string | null): boolean;

  resolveSendTransport(
    objectType: string,
    sourceChannel: string | null,
  ): Promise<{ graphUrl: string; accessToken: string }>;

  resolveGraphAttachmentType(
    mediaType: ThreadMessageMediaType,
    thread: { objectType: string; sourceChannel: string | null },
  ): 'image' | 'audio' | 'video' | 'file';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postToGraphWithFallback(
    thread: { objectType: string; sourceChannel: string | null },
    body: any,
    primary: { graphUrl: string; accessToken: string },
  ): Promise<any>;
}
