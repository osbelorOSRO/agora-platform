import type { ThreadEventInput } from '../services/thread-event.service';
import type { ThreadSelectorInput } from '../services/thread.service';

export const META_INBOX_GATEWAY = Symbol('META_INBOX_GATEWAY');

export interface IMetaInboxGateway {
  recordThreadEvent(input: ThreadEventInput): Promise<void>;
  sendSystemText(
    input: ThreadSelectorInput & { text: string },
  ): Promise<unknown>;
}
