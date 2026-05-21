import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Archive,
  Ban,
  Bot,
  CheckCircle2,
  Facebook,
  Headset,
  ImagePlus,
  Inbox,
  Instagram,
  MessageCircle,
  Mic,
  MoreVertical,
  Save,
  Search,
  Send,
  ShieldCheck,
  Workflow,
  X,
} from "lucide-react";
import useEsMovil from "@/hooks/useEsMovil";
import {
  connectSocket,
  offMetaInboxMessageNew,
  offMetaInboxThreadUpsert,
  onMetaInboxMessageNew,
  onMetaInboxThreadUpsert,
} from "@/services/socket";
import {
  listMetaInboxMessages,
  sendMetaInboxMedia,
  listMetaInboxThreads,
  reopenMetaInboxThread,
  sendMetaInboxText,
  updateMetaInboxContact,
  updateMetaInboxThreadControl,
  updateWhatsappBlockStatus,
} from "@/services/metaInbox.service";
import type {
  MetaInboxContactUpdate,
  MetaInboxContentJson,
  MetaInboxMessage,
  MetaInboxThread,
  MetaInboxThreadControlUpdate,
} from "@/types/metaInbox";
import ChatAnimation from "@/components/ChatAnimation";
import VoiceRecorder from "@/components/VoiceRecorder";
import { normalizeMediaUrl } from "@/utils/mediaUrl";

type InboxRealtimePayload = Partial<MetaInboxThread> &
  Partial<MetaInboxMessage> & {
    sessionId?: string;
  };

const formatRelativeTs = (value?: string | null) => {
  if (!value) return "";
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return "";
  const deltaSec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (deltaSec < 60) return "hace 1 min";
  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) return `hace ${deltaMin} min`;
  const deltaH = Math.floor(deltaMin / 60);
  if (deltaH < 24) return `hace ${deltaH} h`;
  const deltaD = Math.floor(deltaH / 24);
  return `hace ${deltaD} d`;
};

const sortThreads = (items: MetaInboxThread[]) =>
  [...items].sort((a, b) => +new Date(b.lastMessageAt || 0) - +new Date(a.lastMessageAt || 0));

const STATUS_VIEWS = ["OPEN", "ARCHIVED", "CLOSED"] as const;
type StatusView = (typeof STATUS_VIEWS)[number];

const THREAD_STATUS_OPTIONS = ["OPEN", "PAUSED", "ARCHIVED", "CLOSED"] as const;
const ATTENTION_MODE_OPTIONS = ["N8N", "HUMAN", "SYSTEM", "PAUSED"] as const;
const THREAD_STAGE_OPTIONS = [
  "acepta_oferta",
  "cierre_no_exitoso",
  "delegacion_humano",
  "entrega_datos_lineas",
  "entrega_datos_rut",
  "inicio",
  "intencion_humano",
  "intencion_ofertas",
  "intencion_requisitos",
  "lineas_factibles",
  "lineas_no_factibles",
  "no_acepta_oferta",
  "objeta_ofertas",
  "ofertas_alta",
  "ofertas_porta",
  "otras_solicitudes",
  "requisitos_rechaza_alta",
  "requisitos_rechaza_porta",
  "requisitos_acepta_alta",
  "requisitos_acepta_negociacion",
  "requisitos_acepta_porta",
  "requisitos_datos_lineas",
  "requisitos_datos_rut",
  "requisitos_lineas_factibles",
  "requisitos_lineas_no_factibles",
  "requisitos_objeta_alta",
  "requisitos_objeta_porta",
  "requisitos_oferta_alta",
  "requisitos_oferta_porta",
  "requisitos_rut_factible",
  "requisitos_rut_no_factible",
  "rut_factible",
  "rut_no_factible",
] as const;

const extractMedia = (contentJson: MetaInboxContentJson | null | undefined) => {
  const mediaType = String(contentJson?.mediaType || "").toLowerCase();
  const mediaUrl = normalizeMediaUrl(contentJson?.mediaUrl ? String(contentJson.mediaUrl) : "");
  if (mediaUrl && (mediaType === "audio" || mediaType === "image")) {
    return { mediaType, mediaUrl } as const;
  }
  const fallbackAttachments = Array.isArray((contentJson as any)?.message?.attachments)
    ? ((contentJson as any).message.attachments as Array<any>)
    : [];
  const first = fallbackAttachments[0];
  const fallbackType = String(first?.type || "").toLowerCase();
  const fallbackUrl = normalizeMediaUrl(first?.payload?.url ? String(first.payload.url) : "");
  if (fallbackUrl && (fallbackType === "audio" || fallbackType === "image")) {
    return { mediaType: fallbackType, mediaUrl: fallbackUrl } as const;
  }
  return null;
};

const compactActorId = (thread: MetaInboxThread) => {
  const phone = thread.phone?.trim();
  if (phone) return phone;
  const actor = thread.actorExternalId || "";
  const phoneFromJid = actor.match(/^(\d{8,15})@/)?.[1];
  if (phoneFromJid) return phoneFromJid;
  if (actor.length > 24) return `${actor.slice(0, 10)}...${actor.slice(-8)}`;
  return actor;
};

const normalizeText = (value?: string | null) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const stageLabel = (value?: string | null) => {
  const raw = String(value || "sin_etapa");
  return raw
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const statusLabel = (value: StatusView) => {
  if (value === "OPEN") return "Open";
  if (value === "ARCHIVED") return "Archived";
  return "Closed";
};

const statusIcon = (value: StatusView) => {
  if (value === "OPEN") return Inbox;
  if (value === "ARCHIVED") return Archive;
  return CheckCircle2;
};

const threadMatchesStatus = (thread: MetaInboxThread, view: StatusView) => {
  const status = String(thread.threadStatus || "OPEN").toUpperCase();
  if (view === "OPEN") return status === "OPEN" || status === "PAUSED";
  return status === view;
};

const ChannelIcon: React.FC<{ objectType?: string; className?: string }> = ({ objectType, className }) => {
  const normalized = String(objectType || "").toUpperCase();
  if (normalized === "INSTAGRAM") {
    return <Instagram className={className} />;
  }
  if (normalized === "WHATSAPP") {
    return <MessageCircle className={className} />;
  }
  return <Facebook className={className} />;
};

const AttentionIcon: React.FC<{ mode?: string; className?: string }> = ({ mode, className }) => {
  const normalized = String(mode || "").toUpperCase();
  if (normalized === "HUMAN") return <Headset className={className} />;
  if (normalized === "SYSTEM") return <Bot className={className} />;
  return <Workflow className={className} />;
};

const attentionClass = (mode?: string) => {
  const normalized = String(mode || "").toUpperCase();
  if (normalized === "HUMAN") return "border-sky-300/70 bg-[#182D46] text-sky-300 md:shadow-[0_0_14px_rgba(56,189,248,0.35)]";
  if (normalized === "SYSTEM") return "border-emerald-300/70 bg-[#173038] text-emerald-300 md:shadow-[0_0_14px_rgba(52,211,153,0.35)]";
  if (normalized === "PAUSED") return "border-amber-300/70 bg-[#352D27] text-amber-300 md:shadow-[0_0_14px_rgba(251,191,36,0.35)]";
  return "border-rose-300/70 bg-[#352135] text-rose-300 md:shadow-[0_0_14px_rgba(251,113,133,0.35)]";
};

const channelClass = (objectType?: string) => {
  const normalized = String(objectType || "").toUpperCase();
  if (normalized === "WHATSAPP") return "border-emerald-300/60 bg-[#173038] text-emerald-300";
  if (normalized === "INSTAGRAM") return "border-fuchsia-300/60 bg-[#322247] text-fuchsia-300";
  return "border-sky-300/60 bg-[#182D46] text-sky-300";
};

const s = {
  pagina: "flex flex-1 flex-col overflow-hidden bg-background text-foreground",
  errorBanner: "sticky top-0 z-50 border-b border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-400",
  mainBase: "flex min-h-0 flex-1 overflow-hidden",
  mainWithContact: "grid grid-cols-[280px_1fr_320px]",
  mainWithoutContact: "grid grid-cols-[280px_1fr]",
  sidebar: "flex flex-col overflow-y-auto border-r border-border bg-card scrollbar-custom",
  sidebarInfo: "mt-2 text-[11px] text-muted-foreground",
  threadItem: "border-b border-border px-2 py-2 transition hover:bg-input",
  threadItemActive: "bg-input",
  threadRow: "flex items-start gap-1",
  threadMainButton: "min-w-0 flex-1 text-left",
  threadTop: "flex items-center justify-between gap-2",
  threadName: "text-sm font-bold text-foreground",
  threadTime: "text-[10px] text-muted-foreground",
  threadPreview: "text-xs text-muted-foreground",
  menuButton: "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-input hover:text-foreground",
  menuPopup: "absolute right-0 top-8 z-30 min-w-[140px] rounded-md border border-border bg-card shadow-xl",
  menuOption: "block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-input transition-colors",
  chatPanel: "flex min-h-0 flex-1 flex-col overflow-hidden",
  chatHeader: "border-b border-border bg-card px-4 py-3",
  chatHeaderRow: "flex items-start justify-between gap-2",
  chatName: "text-base font-bold text-foreground",
  chatChannel: "",
  closeButton: "flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:border-rose-400/30 hover:text-rose-400 transition-colors",
  messagesArea: "flex-1 overflow-y-auto space-y-2 p-4 scrollbar-custom",
  loadingText: "py-4 text-center text-sm text-muted-foreground",
  bubbleWrapOutgoing: "flex justify-end",
  bubbleWrapIncoming: "flex justify-start",
  bubbleOutgoing: "max-w-[75%] rounded-2xl rounded-tr-sm border border-primary/30 bg-[#2E1030] px-3 py-2 text-sm text-foreground",
  bubbleIncoming: "max-w-[75%] rounded-2xl rounded-tl-sm border border-border bg-card px-3 py-2 text-sm text-foreground",
  bubbleTsOutgoing: "mt-1 text-right text-[10px] text-muted-foreground",
  bubbleTsIncoming: "mt-1 text-[10px] text-muted-foreground",
  composer: "flex items-center gap-2 border-t border-border bg-card px-3 py-2",
  composerInput: "min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50",
  composerSend: "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors",
  composerIcon: "h-4 w-4",
  contactAside: "flex flex-col gap-2 overflow-y-auto border-l border-border bg-card p-3 scrollbar-custom",
  contactHead: "flex items-center justify-between pb-2 border-b border-border",
  contactTitle: "text-xs font-bold uppercase tracking-[0.22em] text-primary",
  contactInput: "w-full rounded-md border border-border bg-input px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary/60 transition disabled:opacity-60",
  contactTextarea: "w-full rounded-md border border-border bg-input px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary/60 transition disabled:opacity-60 min-h-[72px] resize-none",
  contactSave: "flex items-center justify-center gap-2 w-full rounded-md border border-primary/50 bg-primary/10 px-3 py-2 text-sm font-bold text-primary hover:bg-primary/20 transition disabled:cursor-not-allowed disabled:opacity-60",
};

const MetaInboxPage: React.FC = () => {
  const navigate = useNavigate();
  const esMovil = useEsMovil();
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSessionId = searchParams.get("sessionId");
  const requestedActorId = searchParams.get("actor");
  const [threads, setThreads] = useState<MetaInboxThread[]>([]);
  const [messages, setMessages] = useState<MetaInboxMessage[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [sending, setSending] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<File | null>(null);
  const [savingThreadControl, setSavingThreadControl] = useState(false);
  const [reopeningThread, setReopeningThread] = useState(false);
  const [updatingWhatsappBlock, setUpdatingWhatsappBlock] = useState<"block" | "unblock" | null>(null);
  const [whatsappBlockFeedback, setWhatsappBlockFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openMenuForSessionId, setOpenMenuForSessionId] = useState<string | null>(null);
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
  const [chatManuallyClosed, setChatManuallyClosed] = useState(false);
  const [statusView, setStatusView] = useState<StatusView>("OPEN");
  const [searchQuery, setSearchQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [attentionFilter, setAttentionFilter] = useState("ALL");
  const [contactForm, setContactForm] = useState<MetaInboxContactUpdate>({
    displayName: "",
    firstName: "",
    lastName: "",
    phone: "",
    rut: "",
    address: "",
    email: "",
    notes: "",
    city: "",
    region: "",
  });
  const [showRecorder, setShowRecorder] = useState(false);

  const selectedThread = useMemo(
    () => threads.find((item) => item.sessionId === selectedSessionId) || null,
    [threads, selectedSessionId],
  );
  const selectedWhatsappBlocked =
    String(selectedThread?.objectType || "").toUpperCase() === "WHATSAPP" &&
    String(selectedThread?.whatsappBlockStatus || "").toLowerCase() === "blocked";
  const showContactPanel = !!selectedThread && detailSessionId === selectedSessionId;

  const providers = useMemo(() => {
    const items = Array.from(new Set(threads.map((thread) => String(thread.objectType || "").toUpperCase()).filter(Boolean)));
    return items.sort();
  }, [threads]);

  const filteredThreads = useMemo(() => {
    const query = normalizeText(searchQuery.trim());

    return threads.filter((thread) => {
      if (!threadMatchesStatus(thread, statusView)) return false;

      if (providerFilter !== "ALL" && String(thread.objectType || "").toUpperCase() !== providerFilter) return false;
      if (attentionFilter !== "ALL" && String(thread.attentionMode || "").toUpperCase() !== attentionFilter) return false;

      if (!query) return true;

      const haystack = [
        thread.displayName,
        thread.phone,
        thread.actorExternalId,
        thread.sessionId,
        thread.objectType,
        thread.sourceChannel,
        thread.threadStage,
        stageLabel(thread.threadStage),
        thread.threadStatus,
        thread.attentionMode,
        thread.lastMessageText,
      ]
        .map(normalizeText)
        .join(" ");

      return haystack.includes(query);
    });
  }, [attentionFilter, providerFilter, searchQuery, statusView, threads]);

  const mergeThread = (payload: InboxRealtimePayload) => {
    const payloadSessionId = payload.sessionId ? String(payload.sessionId) : null;
    if (!payloadSessionId) return;

    setThreads((prev) => {
      const idx = prev.findIndex((t) => t.sessionId === payloadSessionId);

      if (idx === -1) {
        const newItem: MetaInboxThread = {
          threadId: payload.threadId ? String(payload.threadId) : undefined,
          sessionId: payloadSessionId,
          actorExternalId: String(payload.actorExternalId),
          objectType: String(payload.objectType),
          sourceChannel: payload.sourceChannel ? String(payload.sourceChannel) : null,
          threadStatus: payload.threadStatus ? String(payload.threadStatus) : "OPEN",
          attentionMode: payload.attentionMode ? String(payload.attentionMode) : "N8N",
          threadStage: payload.threadStage ? String(payload.threadStage) : "inicio",
          displayName: payload.displayName ? String(payload.displayName) : "Nuevo",
          phone: payload.phone ? String(payload.phone) : null,
          email: payload.email ? String(payload.email) : null,
          notes: payload.notes ? String(payload.notes) : null,
          city: payload.city ? String(payload.city) : null,
          whatsappBlockStatus: payload.whatsappBlockStatus ? String(payload.whatsappBlockStatus) : null,
          whatsappBlockUpdatedAt: payload.whatsappBlockUpdatedAt ? String(payload.whatsappBlockUpdatedAt) : null,
          whatsappBlockJidUsed: payload.whatsappBlockJidUsed ? String(payload.whatsappBlockJidUsed) : null,
          lastMessageText: payload.lastMessageText
            ? String(payload.lastMessageText)
            : payload.contentText
              ? String(payload.contentText)
              : null,
          lastDirection: payload.lastDirection
            ? String(payload.lastDirection)
            : payload.direction
              ? String(payload.direction)
              : "INCOMING",
          lastMessageAt: payload.lastMessageAt
            ? String(payload.lastMessageAt)
            : payload.occurredAt
              ? String(payload.occurredAt)
              : new Date().toISOString(),
        };
        return sortThreads([newItem, ...prev]);
      }

      const current = prev[idx];
      const updated: MetaInboxThread = {
        ...current,
        threadId: payload.threadId ? String(payload.threadId) : current.threadId,
        sessionId: payloadSessionId || current.sessionId,
        actorExternalId: payload.actorExternalId ? String(payload.actorExternalId) : current.actorExternalId,
        objectType: payload.objectType ? String(payload.objectType) : current.objectType,
        sourceChannel:
          payload.sourceChannel !== undefined
            ? payload.sourceChannel
              ? String(payload.sourceChannel)
              : null
            : current.sourceChannel,
        threadStatus: payload.threadStatus ? String(payload.threadStatus) : current.threadStatus,
        attentionMode: payload.attentionMode ? String(payload.attentionMode) : current.attentionMode,
        threadStage: payload.threadStage ? String(payload.threadStage) : current.threadStage,
        displayName: payload.displayName ? String(payload.displayName) : current.displayName,
        phone:
          payload.phone !== undefined
            ? payload.phone
              ? String(payload.phone)
              : null
            : current.phone,
        email:
          payload.email !== undefined
            ? payload.email
              ? String(payload.email)
              : null
            : current.email,
        notes:
          payload.notes !== undefined
            ? payload.notes
              ? String(payload.notes)
              : null
            : current.notes,
        city:
          payload.city !== undefined
            ? payload.city
              ? String(payload.city)
              : null
            : current.city,
        whatsappBlockStatus:
          payload.whatsappBlockStatus !== undefined
            ? payload.whatsappBlockStatus
              ? String(payload.whatsappBlockStatus)
              : null
            : current.whatsappBlockStatus,
        whatsappBlockUpdatedAt:
          payload.whatsappBlockUpdatedAt !== undefined
            ? payload.whatsappBlockUpdatedAt
              ? String(payload.whatsappBlockUpdatedAt)
              : null
            : current.whatsappBlockUpdatedAt,
        whatsappBlockJidUsed:
          payload.whatsappBlockJidUsed !== undefined
            ? payload.whatsappBlockJidUsed
              ? String(payload.whatsappBlockJidUsed)
              : null
            : current.whatsappBlockJidUsed,
        lastMessageText:
          payload.lastMessageText !== undefined
            ? payload.lastMessageText
              ? String(payload.lastMessageText)
              : null
            : payload.contentText !== undefined
              ? payload.contentText
                ? String(payload.contentText)
                : null
              : current.lastMessageText,
        lastDirection:
          payload.lastDirection !== undefined
            ? String(payload.lastDirection)
            : payload.direction !== undefined
              ? String(payload.direction)
              : current.lastDirection,
        lastMessageAt:
          payload.lastMessageAt !== undefined
            ? String(payload.lastMessageAt)
            : payload.occurredAt !== undefined
              ? String(payload.occurredAt)
              : current.lastMessageAt,
      };

      const copy = [...prev];
      copy[idx] = updated;
      return sortThreads(copy);
    });
  };

  const findRequestedThread = (items: MetaInboxThread[]) => {
    if (requestedSessionId) {
      return items.find((thread) => thread.sessionId === requestedSessionId) || null;
    }
    if (!requestedActorId) return null;

    const actorQuery = normalizeText(requestedActorId);
    return (
      items.find((thread) => {
        const values = [thread.actorExternalId, thread.phone, thread.displayName, compactActorId(thread)];
        return values.map(normalizeText).some((value) => value.includes(actorQuery));
      }) || null
    );
  };

  const loadThreads = async () => {
    setLoadingThreads(true);
    setError(null);
    try {
      const data = sortThreads(await listMetaInboxThreads(200, 0, true));
      setThreads(data);
      const requested = findRequestedThread(data);
      if (requested) {
        setStatusView(
          String(requested.threadStatus || "").toUpperCase() === "ARCHIVED"
            ? "ARCHIVED"
            : String(requested.threadStatus || "").toUpperCase() === "CLOSED"
              ? "CLOSED"
              : "OPEN",
        );
        setChatManuallyClosed(false);
        setSelectedSessionId(requested.sessionId);
      } else if (!selectedSessionId && !chatManuallyClosed && data.length > 0) {
        setSelectedSessionId(data[0].sessionId);
      }
    } catch (e: any) {
      setError(e?.message || "Error cargando conversaciones");
    } finally {
      setLoadingThreads(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    setLoadingMessages(true);
    setError(null);
    try {
      setMessages(await listMetaInboxMessages(sessionId, false));
    } catch (e: any) {
      setError(e?.message || "Error cargando mensajes");
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    connectSocket();
    loadThreads();
  }, []);

  useEffect(() => {
    if ((!requestedSessionId && !requestedActorId) || loadingThreads) return;
    const requested = findRequestedThread(threads);
    if (!requested) return;
    setStatusView(
      String(requested.threadStatus || "").toUpperCase() === "ARCHIVED"
        ? "ARCHIVED"
        : String(requested.threadStatus || "").toUpperCase() === "CLOSED"
          ? "CLOSED"
          : "OPEN",
    );
    setChatManuallyClosed(false);
    setSelectedSessionId(requested.sessionId);
    setSearchParams({}, { replace: true });
  }, [loadingThreads, requestedActorId, requestedSessionId, setSearchParams, threads]);

  useEffect(() => {
    if (!selectedThread?.sessionId) return;
    loadMessages(selectedThread.sessionId);
    setPendingMedia(null);
  }, [selectedThread?.sessionId]);

  useEffect(() => {
    if (loadingThreads) return;
    if (filteredThreads.length === 0) {
      setSelectedSessionId(null);
      setDetailSessionId(null);
      setMessages([]);
      return;
    }
    if (chatManuallyClosed) return;
    if (!selectedSessionId || !filteredThreads.some((thread) => thread.sessionId === selectedSessionId)) {
      setSelectedSessionId(filteredThreads[0].sessionId);
      setDetailSessionId(null);
    }
  }, [chatManuallyClosed, filteredThreads, loadingThreads, selectedSessionId]);

  useEffect(() => {
    if (!selectedThread) return;
    setContactForm({
      displayName: selectedThread.displayName || "",
      firstName: selectedThread.firstName || "",
      lastName: selectedThread.lastName || "",
      phone: selectedThread.phone || "",
      rut: selectedThread.rut || "",
      address: selectedThread.address || "",
      email: selectedThread.email || "",
      notes: selectedThread.notes || "",
      city: selectedThread.city || "",
      region: selectedThread.region || "",
    });
  }, [selectedThread]);

  useEffect(() => {
    onMetaInboxThreadUpsert((payload) => {
      mergeThread(payload as InboxRealtimePayload);
    });

    onMetaInboxMessageNew((payload) => {
      const data = payload as InboxRealtimePayload;
      mergeThread(data);

      if (!data.sessionId || String(data.sessionId) !== selectedSessionId) return;
      if (!data.externalEventId) return;

      setMessages((prev) => {
        if (prev.some((m) => m.externalEventId === data.externalEventId)) return prev;
        const nextMessage: MetaInboxMessage = {
          externalEventId: String(data.externalEventId),
          messageExternalId: data.messageExternalId ? String(data.messageExternalId) : null,
          sessionId: data.sessionId ? String(data.sessionId) : selectedThread?.sessionId || "",
          actorExternalId: data.actorExternalId ? String(data.actorExternalId) : selectedThread?.actorExternalId || "",
          objectType: data.objectType ? String(data.objectType) : selectedThread?.objectType || "PAGE",
          eventKind: data.eventKind ? String(data.eventKind) : "message",
          direction: data.direction ? String(data.direction) : "INCOMING",
          contentText: data.contentText ? String(data.contentText) : null,
          contentJson: (data.contentJson as MetaInboxContentJson) || null,
          status: data.status ? String(data.status) : "received",
          occurredAt: data.occurredAt ? String(data.occurredAt) : new Date().toISOString(),
        };
        return [...prev, nextMessage];
      });
    });

    return () => {
      offMetaInboxThreadUpsert();
      offMetaInboxMessageNew();
    };
  }, [selectedSessionId, selectedThread?.sessionId, selectedThread?.actorExternalId, selectedThread?.objectType]);

  const handleSaveContact = async () => {
    if (!selectedThread?.sessionId) return;
    setSavingContact(true);
    setError(null);
    try {
      const normalizedContact: MetaInboxContactUpdate = {
        displayName: contactForm.displayName?.trim() || undefined,
        firstName: contactForm.firstName?.trim() || undefined,
        lastName: contactForm.lastName?.trim() || undefined,
        phone: contactForm.phone?.trim() || undefined,
        rut: contactForm.rut?.trim() || undefined,
        address: contactForm.address?.trim() || undefined,
        email: contactForm.email?.trim() || undefined,
        notes: contactForm.notes?.trim() || undefined,
        city: contactForm.city?.trim() || undefined,
        region: contactForm.region?.trim() || undefined,
      };

      await updateMetaInboxContact(selectedThread.sessionId, normalizedContact);
      mergeThread({
        sessionId: selectedThread.sessionId,
        actorExternalId: selectedThread.actorExternalId,
        objectType: selectedThread.objectType,
        displayName: normalizedContact.displayName,
        firstName: normalizedContact.firstName ?? null,
        lastName: normalizedContact.lastName ?? null,
        phone: normalizedContact.phone,
        rut: normalizedContact.rut ?? null,
        address: normalizedContact.address ?? null,
        email: normalizedContact.email,
        notes: normalizedContact.notes,
        city: normalizedContact.city,
        region: normalizedContact.region ?? null,
      });
    } catch (e: any) {
      setError(e?.message || "Error guardando contacto");
    } finally {
      setSavingContact(false);
    }
  };

  const handleThreadControlChange = async (patch: MetaInboxThreadControlUpdate) => {
    if (!selectedThread?.sessionId) return;
    setSavingThreadControl(true);
    setError(null);
    try {
      await updateMetaInboxThreadControl(selectedThread.sessionId, patch);
      mergeThread({
        sessionId: selectedThread.sessionId,
        actorExternalId: selectedThread.actorExternalId,
        objectType: selectedThread.objectType,
        threadStatus: patch.threadStatus,
        attentionMode: patch.attentionMode,
        threadStage: patch.threadStage,
      });
    } catch (e: any) {
      setError(e?.message || "Error actualizando thread");
    } finally {
      setSavingThreadControl(false);
    }
  };

  const handleReopenThread = async (sessionId: string) => {
    if (!sessionId) return;
    setReopeningThread(true);
    setError(null);
    try {
      const reopened = await reopenMetaInboxThread(sessionId);
      mergeThread(reopened);
      setChatManuallyClosed(false);
      setSelectedSessionId(reopened.sessionId);
      setDetailSessionId(reopened.sessionId);
      setMessages([]);
    } catch (e: any) {
      setError(e?.message || "Error abriendo nueva atencion");
    } finally {
      setReopeningThread(false);
    }
  };

  const handleWhatsappBlockStatus = async (action: "block" | "unblock") => {
    if (!selectedThread?.sessionId) return;
    setUpdatingWhatsappBlock(action);
    setError(null);
    setWhatsappBlockFeedback(null);
    try {
      const result = await updateWhatsappBlockStatus({
        action,
        sessionId: selectedThread.sessionId,
        actorExternalId: selectedThread.actorExternalId,
        phone: selectedThread.phone,
      });
      const jidUsed = result?.gatewayResult?.jidUsed || result?.identity?.preferredBlockJid || "";
      setWhatsappBlockFeedback(
        action === "block"
          ? `Contacto bloqueado${jidUsed ? ` (${jidUsed})` : ""}.`
          : `Contacto desbloqueado${jidUsed ? ` (${jidUsed})` : ""}.`,
      );
      mergeThread({
        sessionId: selectedThread.sessionId,
        actorExternalId: selectedThread.actorExternalId,
        objectType: selectedThread.objectType,
        whatsappBlockStatus: action === "block" ? "blocked" : "unblocked",
        whatsappBlockUpdatedAt: new Date().toISOString(),
        whatsappBlockJidUsed: jidUsed || null,
      });
      await loadThreads();
    } catch (e: any) {
      setError(e?.message || "Error actualizando bloqueo de WhatsApp");
    } finally {
      setUpdatingWhatsappBlock(null);
    }
  };

  const handleSend = async () => {
    if (!selectedThread?.sessionId || (!draft.trim() && !pendingMedia)) return;
    if (selectedWhatsappBlocked) {
      setError("Este contacto está bloqueado. Debes desbloquearlo antes de chatear.");
      return;
    }
    if (pendingMedia) {
      await handleSendMedia(pendingMedia, draft.trim());
      return;
    }
    setSending(true);
    setError(null);
    try {
      const text = draft.trim();
      const result = await sendMetaInboxText(selectedThread.sessionId, text);
      setDraft("");

      setMessages((prev) => {
        const externalEventId =
          result?.externalEventId || `out_local_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
        if (prev.some((m) => m.externalEventId === externalEventId)) return prev;
        return [
          ...prev,
          {
            externalEventId,
            messageExternalId: result?.messageExternalId || null,
            sessionId: selectedThread.sessionId,
            actorExternalId: selectedThread.actorExternalId,
            objectType: selectedThread.objectType,
            eventKind: "message",
            direction: "OUTGOING",
            contentText: text,
            contentJson: null,
            status: "sent",
            occurredAt: result?.occurredAt || new Date().toISOString(),
          },
        ];
      });

      mergeThread({
        sessionId: selectedThread.sessionId,
        actorExternalId: selectedThread.actorExternalId,
        objectType: selectedThread.objectType,
        lastMessageText: text,
        lastDirection: "OUTGOING",
        lastMessageAt: result?.occurredAt || new Date().toISOString(),
      });
    } catch (e: any) {
      setError(e?.message || "Error enviando mensaje");
    } finally {
      setSending(false);
    }
  };

  const handleSendMedia = async (file: File, caption?: string) => {
    if (!selectedThread?.sessionId) return;
    if (selectedWhatsappBlocked) {
      setError("Este contacto está bloqueado. Debes desbloquearlo antes de chatear.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const text = caption?.trim() || "";
      const result = await sendMetaInboxMedia(selectedThread.sessionId, file, text);
      setDraft("");
      setPendingMedia(null);
      const mediaType = String(result?.mediaType || "").toLowerCase() === "audio" ? "audio" : "image";
      const mediaUrl = normalizeMediaUrl(result?.mediaUrl ? String(result.mediaUrl) : "");
      const placeholder = mediaType === "audio" ? "[audio]" : "[imagen]";
      const contentText = text || placeholder;

      setMessages((prev) => {
        const externalEventId =
          result?.externalEventId || `out_local_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
        if (prev.some((m) => m.externalEventId === externalEventId)) return prev;
        return [
          ...prev,
          {
            externalEventId,
            messageExternalId: result?.messageExternalId || null,
            sessionId: selectedThread.sessionId,
            actorExternalId: selectedThread.actorExternalId,
            objectType: selectedThread.objectType,
            eventKind: "message",
            direction: "OUTGOING",
            contentText,
            contentJson: {
              mediaType,
              mediaUrl,
              caption: text || null,
            },
            status: "sent",
            occurredAt: result?.occurredAt || new Date().toISOString(),
          },
        ];
      });

      mergeThread({
        sessionId: selectedThread.sessionId,
        actorExternalId: selectedThread.actorExternalId,
        objectType: selectedThread.objectType,
        lastMessageText: contentText,
        lastDirection: "OUTGOING",
        lastMessageAt: result?.occurredAt || new Date().toISOString(),
      });
    } catch (e: any) {
      setError(e?.message || "Error enviando archivo");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={s.pagina}>
      {error && <div className={s.errorBanner}>{error}</div>}

      <main
        className={`${s.mainBase} ${
          esMovil
            ? ""
            : showContactPanel ? s.mainWithContact : s.mainWithoutContact
        }`}
      >
        <section className={esMovil
          ? mobileShowChat
            ? "hidden"
            : "flex flex-col w-full overflow-y-auto bg-card scrollbar-custom"
          : s.sidebar
        }>
          <div className="sticky top-0 z-20 border-b border-border bg-card p-3">
            <div className="grid grid-cols-3 gap-1">
              {STATUS_VIEWS.map((view) => {
                const Icon = statusIcon(view);
                const count = threads.filter((thread) => threadMatchesStatus(thread, view)).length;
                const active = statusView === view;
                return (
                  <button
                    key={view}
                    onClick={() => setStatusView(view)}
                    className={`flex h-9 items-center justify-center gap-1.5 rounded-md border text-[11px] font-bold transition ${
                      active
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-input text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                    title={statusLabel(view)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex h-9 items-center gap-2 rounded-md border border-border bg-input px-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar actor, mensaje, etapa..."
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
              />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="h-8 rounded-md border border-border bg-input px-2 text-xs text-foreground outline-none"
                title="Canal"
              >
                <option value="ALL">Todos</option>
                {providers.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
              <select
                value={attentionFilter}
                onChange={(e) => setAttentionFilter(e.target.value)}
                className="h-8 rounded-md border border-border bg-input px-2 text-xs text-foreground outline-none"
                title="Modo"
              >
                <option value="ALL">Modos</option>
                {ATTENTION_MODE_OPTIONS.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>

            <div className={s.sidebarInfo}>
              {loadingThreads ? "Cargando conversaciones..." : `${filteredThreads.length}/${threads.length} conversaciones`}
            </div>
          </div>

          {filteredThreads.map((thread) => {
            const active = thread.sessionId === selectedSessionId;
            const attentionMode = String(thread.attentionMode || "N8N").toUpperCase();
            const actorLabel = compactActorId(thread);
            const hasUsefulName = !!thread.displayName && normalizeText(thread.displayName) !== "nuevo";
            const title = hasUsefulName ? thread.displayName : actorLabel || "Nuevo";
            const subtitle = hasUsefulName && actorLabel ? actorLabel : "";
            const stage = stageLabel(thread.threadStage);
            const channelTitle = String(thread.objectType || "PAGE").toUpperCase();
            return (
              <div
                key={thread.sessionId}
                className={`${s.threadItem} ${
                  active ? s.threadItemActive : ""
                }`}
              >
                <div className={s.threadRow}>
                    <button
                      onClick={() => {
                        setChatManuallyClosed(false);
                        setSelectedSessionId(thread.sessionId);
                        if (esMovil) setMobileShowChat(true);
                      }}
                      className={s.threadMainButton}
                    >
                    <div className="flex min-w-0 items-start gap-2">
                      <span
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${channelClass(thread.objectType)}`}
                        title={channelTitle}
                      >
                        <ChannelIcon
                          objectType={thread.objectType}
                          className="h-4 w-4"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className={s.threadTop}>
                          <span className={`${s.threadName} truncate`}>{title}</span>
                          <span className={`${s.threadTime} shrink-0`}>
                            {formatRelativeTs(thread.lastMessageAt)}
                          </span>
                        </div>
                        <div className={`${s.threadPreview} mt-1 truncate`}>
                          {thread.lastMessageText || "(sin texto)"}
                        </div>
                        <div className="mt-2 flex min-w-0 items-center gap-1.5">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${attentionClass(attentionMode)}`}
                            title={attentionMode}
                          >
                            <AttentionIcon mode={attentionMode} className="h-3.5 w-3.5" />
                          </span>
                          <span
                            className="min-w-0 truncate rounded-md border border-primary/40 bg-primary/10 px-1.5 py-1 text-[10px] font-bold text-primary"
                            title={thread.threadStage || ""}
                          >
                            {stage}
                          </span>
                          {subtitle && (
                            <span className="min-w-0 truncate text-[10px] text-muted-foreground">
                              {subtitle}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuForSessionId((prev) => (prev === thread.sessionId ? null : thread.sessionId))}
                      className={s.menuButton}
                      aria-label="menu actor"
                    >
                      <MoreVertical size={14} />
                    </button>
                    {openMenuForSessionId === thread.sessionId && (
                      <div className={s.menuPopup}>
                        <button
                          onClick={() => {
                            setChatManuallyClosed(false);
                            setSelectedSessionId(thread.sessionId);
                            setDetailSessionId(thread.sessionId);
                            setOpenMenuForSessionId(null);
                          }}
                          className={s.menuOption}
                        >
                          Ver detalle
                        </button>
                        {(thread.threadStatus === "ARCHIVED" || thread.threadStatus === "CLOSED") && (
                          <button
                            onClick={() => {
                              setChatManuallyClosed(false);
                              setSelectedSessionId(thread.sessionId);
                              setDetailSessionId(thread.sessionId);
                              setOpenMenuForSessionId(null);
                              void handleReopenThread(thread.sessionId);
                            }}
                            className={s.menuOption}
                          >
                            Nueva atencion
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {!loadingThreads && filteredThreads.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Sin conversaciones en esta vista
            </div>
          )}
        </section>

        <section className={esMovil
          ? mobileShowChat
            ? "flex flex-col flex-1 overflow-hidden"
            : "hidden"
          : s.chatPanel
        }>
          {!selectedThread ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ChatAnimation />
              <h1 className="mt-8 text-3xl font-bold text-foreground">
                Agora Web
              </h1>
              <p className="mt-4 max-w-md text-center text-muted-foreground">
                Envía y recibe mensajes de tus contactos.
              </p>
            </div>
          ) : (
            <>
              <div className={s.chatHeader}>
                <div className={s.chatHeaderRow}>
                  <div>
                    <div className={s.chatName}>
                      {normalizeText(selectedThread.displayName) !== "nuevo"
                        ? selectedThread.displayName
                        : compactActorId(selectedThread) || "Nuevo"}
                    </div>
                    <div className={`${s.chatChannel} mt-2 flex items-center gap-2.5`}>
                      <span
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${channelClass(selectedThread.objectType)}`}
                        title={String(selectedThread.objectType || "PAGE").toUpperCase()}
                      >
                        <ChannelIcon
                          objectType={selectedThread.objectType}
                          className="h-4 w-4"
                        />
                      </span>
                      <span
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${attentionClass(selectedThread.attentionMode)}`}
                        title={selectedThread.attentionMode}
                      >
                        <AttentionIcon mode={selectedThread.attentionMode} className="h-4 w-4" />
                      </span>
                      <span className="inline-flex h-8 items-center rounded-md border border-primary/40 bg-primary/10 px-2.5 text-xs font-bold text-primary">
                        {stageLabel(selectedThread.threadStage)}
                      </span>
                      {selectedWhatsappBlocked && (
                        <span className="inline-flex h-8 items-center rounded-md border border-rose-400/60 bg-rose-500/15 px-2.5 text-xs font-bold text-rose-200">
                          Bloqueado
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (esMovil) {
                        setMobileShowChat(false);
                        setChatManuallyClosed(true);
                        setSelectedSessionId(null);
                        setDetailSessionId(null);
                        setMessages([]);
                      } else {
                        setChatManuallyClosed(true);
                        setSelectedSessionId(null);
                        setDetailSessionId(null);
                        setMessages([]);
                      }
                    }}
                    className={s.closeButton}
                    aria-label="Cerrar chat"
                    title="Cerrar chat"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className={s.messagesArea}>
                {selectedWhatsappBlocked && (
                  <div className="mb-3 rounded-lg border border-rose-400/50 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-100">
                    Bloqueaste a este contacto. Desbloquéalo para volver a chatear.
                  </div>
                )}
                {loadingMessages && <div className={s.loadingText}>Cargando mensajes...</div>}
                {!loadingMessages &&
                  messages.map((msg) => {
                    const outgoing = msg.direction === "OUTGOING";
                    const media = extractMedia(msg.contentJson);
                    return (
                      <div
                        key={msg.externalEventId}
                        className={outgoing ? s.bubbleWrapOutgoing : s.bubbleWrapIncoming}
                      >
                        <div
                          className={outgoing ? s.bubbleOutgoing : s.bubbleIncoming}
                        >
                          {media?.mediaType === "image" && (
                            <img
                              src={media.mediaUrl}
                              alt="imagen"
                              className="max-w-[220px] rounded-md border border-border mb-1"
                            />
                          )}
                          {media?.mediaType === "audio" && (
                            <audio controls src={media.mediaUrl} className="max-w-[220px] mb-1">
                              Tu navegador no soporta audio.
                            </audio>
                          )}
                          <div>
                            {msg.contentText && msg.contentText !== "[audio]" && msg.contentText !== "[imagen]"
                              ? msg.contentText
                              : !media
                                ? "(mensaje sin texto)"
                                : null}
                          </div>
                          <div className={outgoing ? s.bubbleTsOutgoing : s.bubbleTsIncoming}>
                            {formatRelativeTs(msg.occurredAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {pendingMedia && (
                <div className="flex items-center justify-between gap-3 border-t border-border bg-muted px-3 py-2">
                  <div className="min-w-0 text-sm text-foreground">
                    <span className="font-bold">Imagen adjunta</span>
                    <span className="ml-2 text-foreground/70">{pendingMedia.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingMedia(null)}
                    className={s.closeButton}
                    aria-label="Quitar adjunto"
                    title="Quitar adjunto"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <div className={`${s.composer} ${selectedWhatsappBlocked ? "opacity-60" : ""}`}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={
                    selectedWhatsappBlocked
                      ? "Contacto bloqueado. Desbloquéalo para chatear."
                      : pendingMedia
                        ? "Escribe un texto para la imagen..."
                        : "Escribe un mensaje..."
                  }
                  className={s.composerInput}
                  disabled={selectedWhatsappBlocked}
                />
                <label
                  className={`${s.composerSend} ${selectedWhatsappBlocked ? "pointer-events-none" : ""}`}
                  aria-label="Adjuntar imagen"
                  title="Adjuntar imagen"
                >
                  <ImagePlus className={s.composerIcon} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setPendingMedia(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                <button
                  onClick={() => setShowRecorder((prev) => !prev)}
                  className={s.composerSend}
                  disabled={selectedWhatsappBlocked}
                  aria-label="Grabar audio"
                  title="Grabar audio"
                >
                  <Mic className={s.composerIcon} />
                </button>
                <button
                  onClick={handleSend}
                  disabled={selectedWhatsappBlocked || sending || (!draft.trim() && !pendingMedia)}
                  className={s.composerSend}
                  aria-label="Enviar"
                  title="Enviar"
                >
                  <Send className={s.composerIcon} />
                </button>
              </div>
              {showRecorder && (
                <div className="px-3 pb-3 bg-background border-t border-border">
                  <VoiceRecorder
                    onAudioReady={(file) => {
                      setShowRecorder(false);
                      handleSendMedia(file);
                    }}
                  />
                </div>
              )}
            </>
          )}
        </section>

        {showContactPanel && (
          <aside className={s.contactAside}>
            <div className={s.contactHead}>
              <h2 className={s.contactTitle}>Detalle</h2>
              <button
                onClick={() => setDetailSessionId(null)}
                className={s.closeButton}
                aria-label="Cerrar detalle"
                title="Cerrar detalle"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2 border-b border-border pb-3">
              <div className="text-xs uppercase tracking-wide text-foreground/70">Thread</div>
              <select
                value={selectedThread.threadStatus}
                onChange={(e) => void handleThreadControlChange({ threadStatus: e.target.value })}
                disabled={savingThreadControl}
                className={s.contactInput}
              >
                {THREAD_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    Estado: {option}
                  </option>
                ))}
              </select>
              <select
                value={selectedThread.attentionMode}
                onChange={(e) => void handleThreadControlChange({ attentionMode: e.target.value })}
                disabled={savingThreadControl}
                className={s.contactInput}
              >
                {ATTENTION_MODE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    Modo: {option}
                  </option>
                ))}
              </select>
              <select
                value={selectedThread.threadStage}
                onChange={(e) => void handleThreadControlChange({ threadStage: e.target.value })}
                disabled={savingThreadControl}
                className={s.contactInput}
              >
                {THREAD_STAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    Etapa: {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 border-b border-border pb-3">
              <div className="text-xs uppercase tracking-wide text-foreground/70">Actor</div>
              <div className={s.contactInput}>
                Score: {selectedThread.actorScore ?? "0"}
              </div>
              <div className={s.contactInput}>
                Lifecycle: {selectedThread.actorLifecycleState ?? "SIN_ESTADO"}
              </div>
              <div className={s.contactInput}>
                Actualizado:{" "}
                {selectedThread.actorLifecycleUpdatedAt
                  ? formatRelativeTs(selectedThread.actorLifecycleUpdatedAt)
                  : "sin registro"}
              </div>
            </div>
            {String(selectedThread.objectType || "").toUpperCase() === "WHATSAPP" && (
              <div className="space-y-2 border-b border-border pb-3">
                <div className="text-xs uppercase tracking-wide text-foreground/70">WhatsApp</div>
                <button
                  type="button"
                  onClick={() => void handleWhatsappBlockStatus("block")}
                  disabled={!!updatingWhatsappBlock}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-rose-400/50 bg-rose-500/10 px-3 py-2 text-sm font-bold text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Ban size={16} />
                  {updatingWhatsappBlock === "block" ? "Bloqueando..." : "Bloquear contacto"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleWhatsappBlockStatus("unblock")}
                  disabled={!!updatingWhatsappBlock}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-emerald-400/50 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ShieldCheck size={16} />
                  {updatingWhatsappBlock === "unblock" ? "Desbloqueando..." : "Desbloquear contacto"}
                </button>
                <div className="text-[11px] leading-relaxed text-foreground/70">
                  Usa el par PN/LID persistido cuando existe. Si falta LID, el backend intenta resolverlo con Baileys.
                </div>
                {whatsappBlockFeedback && (
                  <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-200">
                    {whatsappBlockFeedback}
                  </div>
                )}
              </div>
            )}
            <div className="text-xs uppercase tracking-wide text-foreground/70">Contacto</div>
            <input
              value={contactForm.displayName || ""}
              onChange={(e) => setContactForm((prev) => ({ ...prev, displayName: e.target.value }))}
              placeholder="Nombre completo"
              className={s.contactInput}
              disabled={!selectedThread}
            />
            <input
              value={contactForm.firstName || ""}
              onChange={(e) => setContactForm((prev) => ({ ...prev, firstName: e.target.value }))}
              placeholder="Nombres"
              className={s.contactInput}
              disabled={!selectedThread}
            />
            <input
              value={contactForm.lastName || ""}
              onChange={(e) => setContactForm((prev) => ({ ...prev, lastName: e.target.value }))}
              placeholder="Apellidos"
              className={s.contactInput}
              disabled={!selectedThread}
            />
            <input
              value={contactForm.rut || ""}
              onChange={(e) => setContactForm((prev) => ({ ...prev, rut: e.target.value }))}
              placeholder="RUT"
              className={s.contactInput}
              disabled={!selectedThread}
            />
            <input
              value={contactForm.phone || ""}
              onChange={(e) => setContactForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Teléfono"
              className={s.contactInput}
              disabled={!selectedThread}
            />
            <input
              value={contactForm.email || ""}
              onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email"
              className={s.contactInput}
              disabled={!selectedThread}
            />
            <input
              value={contactForm.address || ""}
              onChange={(e) => setContactForm((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Dirección"
              className={s.contactInput}
              disabled={!selectedThread}
            />
            <input
              value={contactForm.city || ""}
              onChange={(e) => setContactForm((prev) => ({ ...prev, city: e.target.value }))}
              placeholder="Ciudad"
              className={s.contactInput}
              disabled={!selectedThread}
            />
            <input
              value={contactForm.region || ""}
              onChange={(e) => setContactForm((prev) => ({ ...prev, region: e.target.value }))}
              placeholder="Región"
              className={s.contactInput}
              disabled={!selectedThread}
            />
            <textarea
              value={contactForm.notes || ""}
              onChange={(e) => setContactForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas"
              className={s.contactTextarea}
              disabled={!selectedThread}
            />
            <button
              onClick={handleSaveContact}
              disabled={!selectedThread || savingContact}
              className={s.contactSave}
            >
              <Save size={16} />
              Guardar contacto
            </button>
          </aside>
        )}
      </main>
    </div>
  );
};

export default MetaInboxPage;
