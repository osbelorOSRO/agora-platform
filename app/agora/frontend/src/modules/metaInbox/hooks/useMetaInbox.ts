import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  connectSocket,
  offMetaInboxMessageNew,
  offMetaInboxThreadUpsert,
  onMetaInboxMessageNew,
  onMetaInboxThreadUpsert,
} from "@/services/socket";
import {
  listMetaInboxMessages,
  listMetaInboxThreads,
  reopenMetaInboxThread,
  sendMetaInboxMedia,
  sendMetaInboxText,
  updateMetaInboxThreadControl,
  updateWhatsappBlockStatus,
} from "@/services/metaInbox.service";
import type {
  MetaInboxContentJson,
  MetaInboxMessage,
  MetaInboxThread,
  MetaInboxThreadControlUpdate,
} from "@/types/metaInbox";
import { normalizeMediaUrl } from "@/utils/mediaUrl";
import { type StatusView } from "../constants";
import {
  compactActorId,
  mergeThreadIntoList,
  normalizeText,
  sortThreads,
  threadMatchesStatus,
} from "../utils";
import type { InboxRealtimePayload } from "../types";

const THREADS_KEY = ["metaInbox", "threads"] as const;
const messagesKey = (sessionId: string | null) => ["metaInbox", "messages", sessionId] as const;

export function useMetaInbox() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSessionId = searchParams.get("sessionId");
  const requestedActorId = searchParams.get("actor");

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openMenuForSessionId, setOpenMenuForSessionId] = useState<string | null>(null);
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
  const [chatManuallyClosed, setChatManuallyClosed] = useState(false);
  const [statusView, setStatusView] = useState<StatusView>("OPEN");
  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [attentionFilter, setAttentionFilter] = useState("ALL");
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [whatsappBlockFeedback, setWhatsappBlockFeedback] = useState<string | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: threads = [], isLoading: loadingThreads } = useQuery({
    queryKey: THREADS_KEY,
    queryFn: () => listMetaInboxThreads(200, 0, true).then(sortThreads),
    staleTime: 60_000,
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: messagesKey(selectedSessionId),
    queryFn: () => listMetaInboxMessages(selectedSessionId!, false),
    enabled: !!selectedSessionId,
    staleTime: 30_000,
  });

  // Helper: actualiza el cache de threads con un payload realtime
  const updateThreadCache = (payload: InboxRealtimePayload) => {
    qc.setQueryData(THREADS_KEY, (old: MetaInboxThread[] = []) =>
      mergeThreadIntoList(old, payload),
    );
  };

  // ── Socket subscriptions ─────────────────────────────────────────────────────

  useEffect(() => {
    connectSocket();

    onMetaInboxThreadUpsert((payload) => {
      updateThreadCache(payload as InboxRealtimePayload);
    });

    onMetaInboxMessageNew((payload) => {
      const data = payload as InboxRealtimePayload;
      updateThreadCache(data);

      if (!data.sessionId || String(data.sessionId) !== selectedSessionId) return;
      if (!data.externalEventId) return;

      qc.setQueryData(
        messagesKey(selectedSessionId),
        (old: MetaInboxMessage[] = []) => {
          if (old.some((m) => m.externalEventId === data.externalEventId)) return old;
          const next: MetaInboxMessage = {
            externalEventId: String(data.externalEventId),
            messageExternalId: data.messageExternalId ? String(data.messageExternalId) : null,
            sessionId: String(data.sessionId),
            actorExternalId: data.actorExternalId ? String(data.actorExternalId) : "",
            objectType: data.objectType ? String(data.objectType) : "PAGE",
            eventKind: data.eventKind ? String(data.eventKind) : "message",
            direction: data.direction ? String(data.direction) : "INCOMING",
            contentText: data.contentText ? String(data.contentText) : null,
            contentJson: (data.contentJson as MetaInboxContentJson) || null,
            status: data.status ? String(data.status) : "received",
            occurredAt: data.occurredAt ? String(data.occurredAt) : new Date().toISOString(),
          };
          return [...old, next];
        },
      );
    });

    return () => {
      offMetaInboxThreadUpsert();
      offMetaInboxMessageNew();
    };
  }, [selectedSessionId, qc]);

  // ── Derived state ────────────────────────────────────────────────────────────

  const selectedThread = useMemo(
    () => threads.find((t) => t.sessionId === selectedSessionId) || null,
    [threads, selectedSessionId],
  );

  const selectedWhatsappBlocked =
    String(selectedThread?.objectType || "").toUpperCase() === "WHATSAPP" &&
    String(selectedThread?.whatsappBlockStatus || "").toLowerCase() === "blocked";

  const showContactPanel = !!selectedThread && detailSessionId === selectedSessionId;

  const providers = useMemo(
    () =>
      Array.from(
        new Set(threads.map((t) => String(t.objectType || "").toUpperCase()).filter(Boolean)),
      ).sort(),
    [threads],
  );

  const filteredThreads = useMemo(() => {
    const query = normalizeText(searchQuery.trim());
    return threads.filter((t) => {
      if (!threadMatchesStatus(t, statusView)) return false;
      if (providerFilter !== "ALL" && String(t.objectType || "").toUpperCase() !== providerFilter) return false;
      if (attentionFilter !== "ALL" && String(t.attentionMode || "").toUpperCase() !== attentionFilter) return false;
      if (!query) return true;
      const haystack = [t.displayName, t.phone, t.actorExternalId, t.sessionId, t.objectType, t.sourceChannel, t.threadStage, t.threadStatus, t.attentionMode, t.lastMessageText]
        .map(normalizeText).join(" ");
      return haystack.includes(query);
    });
  }, [attentionFilter, providerFilter, searchQuery, statusView, threads]);

  // ── Auto-selección ───────────────────────────────────────────────────────────

  const findRequestedThread = (items: MetaInboxThread[]) => {
    if (requestedSessionId) return items.find((t) => t.sessionId === requestedSessionId) || null;
    if (!requestedActorId) return null;
    const actorQuery = normalizeText(requestedActorId);
    return items.find((t) =>
      [t.actorExternalId, t.phone, t.displayName, compactActorId(t)].map(normalizeText).some((v) => v.includes(actorQuery)),
    ) || null;
  };

  useEffect(() => {
    if (loadingThreads || threads.length === 0) return;
    const requested = findRequestedThread(threads);
    if (requested) {
      const status = String(requested.threadStatus || "").toUpperCase();
      setStatusView(status === "ARCHIVED" ? "ARCHIVED" : status === "CLOSED" ? "CLOSED" : "OPEN");
      setChatManuallyClosed(false);
      setSelectedSessionId(requested.sessionId);
      if (requestedSessionId || requestedActorId) setSearchParams({}, { replace: true });
      return;
    }
    if (!selectedSessionId && !chatManuallyClosed) {
      setSelectedSessionId(filteredThreads[0]?.sessionId ?? null);
    }
  }, [loadingThreads, threads]);

  useEffect(() => {
    if (loadingThreads) return;
    if (filteredThreads.length === 0) {
      setSelectedSessionId(null);
      setDetailSessionId(null);
      return;
    }
    if (chatManuallyClosed) return;
    if (!selectedSessionId || !filteredThreads.some((t) => t.sessionId === selectedSessionId)) {
      setSelectedSessionId(filteredThreads[0].sessionId);
      setDetailSessionId(null);
    }
  }, [chatManuallyClosed, filteredThreads, loadingThreads, selectedSessionId]);

  // ── Mutations ────────────────────────────────────────────────────────────────

  const appendOutgoingText = (sessionId: string, text: string, result: any) => {
    const externalEventId = result?.externalEventId || `out_local_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    qc.setQueryData(messagesKey(sessionId), (old: MetaInboxMessage[] = []) => {
      if (old.some((m) => m.externalEventId === externalEventId)) return old;
      return [...old, {
        externalEventId,
        messageExternalId: result?.messageExternalId || null,
        sessionId, actorExternalId: selectedThread?.actorExternalId ?? "",
        objectType: selectedThread?.objectType ?? "PAGE",
        eventKind: "message", direction: "OUTGOING",
        contentText: text, contentJson: null, status: "sent",
        occurredAt: result?.occurredAt || new Date().toISOString(),
      }];
    });
    updateThreadCache({
      sessionId, actorExternalId: selectedThread?.actorExternalId,
      objectType: selectedThread?.objectType, lastMessageText: text,
      lastDirection: "OUTGOING", lastMessageAt: result?.occurredAt || new Date().toISOString(),
    });
  };

  const { mutateAsync: sendTextMut, isPending: sending } = useMutation({
    mutationFn: ({ sessionId, text }: { sessionId: string; text: string }) =>
      sendMetaInboxText(sessionId, text) as Promise<any>,
    onSuccess: (result, { sessionId, text }) => appendOutgoingText(sessionId, text, result),
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Error enviando mensaje"),
  });

  const { mutateAsync: sendMediaMut } = useMutation({
    mutationFn: ({ sessionId, file, caption }: { sessionId: string; file: File; caption?: string }) =>
      sendMetaInboxMedia(sessionId, file, caption) as Promise<any>,
    onSuccess: (result, { sessionId, caption }) => {
      const mediaType = String(result?.mediaType || "").toLowerCase() === "audio" ? "audio" : "image";
      const mediaUrl = normalizeMediaUrl(result?.mediaUrl ? String(result.mediaUrl) : "");
      const text = caption?.trim() || (mediaType === "audio" ? "[audio]" : "[imagen]");
      const externalEventId = result?.externalEventId || `out_local_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
      qc.setQueryData(messagesKey(sessionId), (old: MetaInboxMessage[] = []) => {
        if (old.some((m) => m.externalEventId === externalEventId)) return old;
        return [...old, {
          externalEventId, messageExternalId: result?.messageExternalId || null,
          sessionId, actorExternalId: selectedThread?.actorExternalId ?? "",
          objectType: selectedThread?.objectType ?? "PAGE",
          eventKind: "message", direction: "OUTGOING",
          contentText: text, contentJson: { mediaType, mediaUrl, caption: caption?.trim() || null },
          status: "sent", occurredAt: result?.occurredAt || new Date().toISOString(),
        }];
      });
      updateThreadCache({ sessionId, actorExternalId: selectedThread?.actorExternalId, objectType: selectedThread?.objectType, lastMessageText: text, lastDirection: "OUTGOING", lastMessageAt: result?.occurredAt || new Date().toISOString() });
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Error enviando archivo"),
  });

  const { mutateAsync: threadControlMut, isPending: savingThreadControl } = useMutation({
    mutationFn: ({ sessionId, patch }: { sessionId: string; patch: MetaInboxThreadControlUpdate }) =>
      updateMetaInboxThreadControl(sessionId, patch),
    onSuccess: (_, { sessionId, patch }) => {
      updateThreadCache({ sessionId, actorExternalId: selectedThread?.actorExternalId, objectType: selectedThread?.objectType, ...patch });
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Error actualizando thread"),
  });

  const { mutateAsync: reopenMut, isPending: reopeningThread } = useMutation({
    mutationFn: (sessionId: string) => reopenMetaInboxThread(sessionId),
    onSuccess: (reopened) => {
      updateThreadCache(reopened);
      setChatManuallyClosed(false);
      setSelectedSessionId(reopened.sessionId);
      setDetailSessionId(reopened.sessionId);
      qc.setQueryData(messagesKey(reopened.sessionId), []);
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Error abriendo nueva atencion"),
  });

  const { mutateAsync: blockMut, isPending: blockPending, variables: blockVars } = useMutation({
    mutationFn: ({ action }: { action: "block" | "unblock" }) =>
      updateWhatsappBlockStatus({
        action,
        sessionId: selectedThread?.sessionId,
        actorExternalId: selectedThread?.actorExternalId,
        phone: selectedThread?.phone,
      }) as Promise<any>,
    onSuccess: (result, { action }) => {
      const jidUsed = result?.gatewayResult?.jidUsed || result?.identity?.preferredBlockJid || "";
      setWhatsappBlockFeedback(action === "block" ? `Contacto bloqueado${jidUsed ? ` (${jidUsed})` : ""}.` : `Contacto desbloqueado${jidUsed ? ` (${jidUsed})` : ""}.`);
      updateThreadCache({
        sessionId: selectedThread?.sessionId,
        actorExternalId: selectedThread?.actorExternalId,
        objectType: selectedThread?.objectType,
        whatsappBlockStatus: action === "block" ? "blocked" : "unblocked",
        whatsappBlockUpdatedAt: new Date().toISOString(),
        whatsappBlockJidUsed: jidUsed || null,
      });
      qc.invalidateQueries({ queryKey: THREADS_KEY });
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : "Error actualizando bloqueo de WhatsApp"),
  });

  // ── Handler API pública ──────────────────────────────────────────────────────

  const handleSend = async (text: string) => {
    if (!selectedThread?.sessionId || !text.trim()) return;
    if (selectedWhatsappBlocked) { setError("Este contacto está bloqueado."); return; }
    setError(null);
    await sendTextMut({ sessionId: selectedThread.sessionId, text: text.trim() });
  };

  const handleSendMedia = async (file: File, caption?: string): Promise<boolean> => {
    if (!selectedThread?.sessionId) return false;
    if (selectedWhatsappBlocked) { setError("Este contacto está bloqueado."); return false; }
    setError(null);
    try { await sendMediaMut({ sessionId: selectedThread.sessionId, file, caption }); return true; }
    catch { return false; }
  };

  const handleThreadControlChange = (patch: MetaInboxThreadControlUpdate) => {
    if (!selectedThread?.sessionId) return;
    setError(null);
    return threadControlMut({ sessionId: selectedThread.sessionId, patch });
  };

  const handleReopenThread = (sessionId: string) => {
    setError(null);
    return reopenMut(sessionId);
  };

  const handleWhatsappBlockStatus = (action: "block" | "unblock") => {
    setError(null);
    setWhatsappBlockFeedback(null);
    return blockMut({ action });
  };

  const selectThread = (sessionId: string, showDetail = false) => {
    setChatManuallyClosed(false);
    setSelectedSessionId(sessionId);
    if (showDetail) setDetailSessionId(sessionId);
  };

  const closeChat = () => {
    setChatManuallyClosed(true);
    setSelectedSessionId(null);
    setDetailSessionId(null);
  };

  return {
    threads, messages, selectedThread, selectedSessionId,
    selectedWhatsappBlocked, showContactPanel,
    loadingThreads, loadingMessages,
    sending,
    savingThreadControl, reopeningThread,
    updatingWhatsappBlock: blockPending ? (blockVars?.action ?? null) : null,
    whatsappBlockFeedback, error,
    statusView, setStatusView,
    searchQuery, setSearchQuery,
    providerFilter, setProviderFilter,
    attentionFilter, setAttentionFilter,
    providers, filteredThreads,
    openMenuForSessionId, setOpenMenuForSessionId,
    detailSessionId, setDetailSessionId,
    mobileShowChat, setMobileShowChat,
    selectThread, closeChat,
    mergeThread: updateThreadCache,
    handleSend, handleSendMedia,
    handleThreadControlChange, handleReopenThread, handleWhatsappBlockStatus,
  };
}
