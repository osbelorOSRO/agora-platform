import type {
  ThreadRow,
  ThreadIdentity,
  ThreadControlSnapshot,
  ThreadSelectorInput,
} from '../services/thread.service';

export const THREAD_GATEWAY = Symbol('THREAD_GATEWAY');

export type {
  ThreadRow,
  ThreadIdentity,
  ThreadControlSnapshot,
  ThreadSelectorInput,
};

export interface IThreadGateway {
  listThreads(input: { limit?: number; offset?: number; includeClosed?: boolean }): Promise<ThreadRow[]>;
  ensureWhatsappThreadForContact(actorExternalId: string): Promise<ThreadRow>;
  getStageTemplatePaths(stageActual: string): Promise<{ stage_actual: string; caminos: Partial<Record<string, unknown>>[] }>;
  updateThreadControl(
    sessionId: string,
    input: {
      threadStatus?: string;
      attentionMode?: string;
      threadStage?: string;
      stageControl?: Record<string, unknown>;
    },
    eventSource?: 'HUMAN' | 'N8N' | 'SYSTEM' | 'API',
  ): Promise<{ ok: boolean; threadStatus: string; attentionMode: string; threadStage: string; stageControl: Record<string, unknown> | null }>;
  reopenThread(sessionId: string): Promise<ThreadRow>;
  resolveThreadByActor(actorExternalId: string, objectType: string, includeClosed?: boolean): Promise<ThreadRow>;
  updateThreadControlForAutomation(input: ThreadSelectorInput & {
    threadStatus?: string;
    attentionMode?: string;
    threadStage?: string;
    stageControl?: Record<string, unknown>;
  }): Promise<{ ok: boolean; threadStatus: string; attentionMode: string; threadStage: string; stageControl: Record<string, unknown> | null; sessionId: string; thread: ThreadRow | null }>;
  getThreadRow(sessionId: string): Promise<ThreadRow | null>;
  getThreadIdentity(sessionId: string): Promise<ThreadIdentity | null>;
  getThreadSnapshot(sessionId: string): Promise<ThreadControlSnapshot | null>;
  resolveSessionIdForAutomation(input: ThreadSelectorInput): Promise<string>;
  upsertThreadRecord(input: {
    sessionId: string;
    actorExternalId: string;
    objectType: string;
    sourceChannel: string | null;
    lastMessageText: string | null;
    lastDirection: 'INCOMING' | 'OUTGOING' | 'SYSTEM';
    lastMessageAt: Date;
  }): Promise<void>;
  notifyThreadUpsert(thread: ThreadControlSnapshot): Promise<void>;
}
