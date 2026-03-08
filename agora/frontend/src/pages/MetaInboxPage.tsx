import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Facebook, ImagePlus, Instagram, Mic, MoreVertical, RefreshCcw, Save, Send, X } from "lucide-react";
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
  sendMetaInboxText,
  updateMetaInboxContact,
} from "@/services/metaInbox.service";
import type { MetaInboxContactUpdate, MetaInboxContentJson, MetaInboxMessage, MetaInboxThread } from "@/types/metaInbox";
import { estilos } from "@/theme/estilos";
import VoiceRecorder from "@/components/VoiceRecorder";
import { normalizeMediaUrl } from "@/utils/mediaUrl";

type InboxRealtimePayload = Partial<MetaInboxThread> &
  Partial<MetaInboxMessage> & {
    sessionId?: string;
  };

const actorKey = (actorExternalId: string, objectType: string) => `${objectType}::${actorExternalId}`;

const getPayloadActorKey = (payload: InboxRealtimePayload): string | null => {
  if (!payload.actorExternalId || !payload.objectType) return null;
  return actorKey(String(payload.actorExternalId), String(payload.objectType));
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

const ChannelIcon: React.FC<{ objectType?: string; className?: string }> = ({ objectType, className }) => {
  const normalized = String(objectType || "").toUpperCase();
  if (normalized === "INSTAGRAM") {
    return <Instagram className={className} />;
  }
  return <Facebook className={className} />;
};

const MetaInboxPage: React.FC = () => {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<MetaInboxThread[]>([]);
  const [messages, setMessages] = useState<MetaInboxMessage[]>([]);
  const [selectedActorKey, setSelectedActorKey] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openMenuForKey, setOpenMenuForKey] = useState<string | null>(null);
  const [contactActorKey, setContactActorKey] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<MetaInboxContactUpdate>({
    displayName: "",
    phone: "",
    email: "",
    notes: "",
    city: "",
  });
  const [showRecorder, setShowRecorder] = useState(false);

  const selectedThread = useMemo(
    () => threads.find((item) => actorKey(item.actorExternalId, item.objectType) === selectedActorKey) || null,
    [threads, selectedActorKey],
  );
  const showContactPanel = !!selectedThread && contactActorKey === selectedActorKey;

  const mergeThread = (payload: InboxRealtimePayload) => {
    const payloadKey = getPayloadActorKey(payload);
    const payloadSessionId = payload.sessionId ? String(payload.sessionId) : null;
    if (!payloadKey && !payloadSessionId) return;

    setThreads((prev) => {
      const idx = prev.findIndex((t) => {
        const keyMatch = payloadKey
          ? actorKey(t.actorExternalId, t.objectType) === payloadKey
          : false;
        const sessionMatch = payloadSessionId ? t.sessionId === payloadSessionId : false;
        return keyMatch || sessionMatch;
      });

      if (idx === -1) {
        if (!payloadKey || !payloadSessionId) return prev;
        const newItem: MetaInboxThread = {
          sessionId: payloadSessionId,
          actorExternalId: String(payload.actorExternalId),
          objectType: String(payload.objectType),
          sourceChannel: payload.sourceChannel ? String(payload.sourceChannel) : null,
          displayName: payload.displayName ? String(payload.displayName) : "Nuevo",
          phone: payload.phone ? String(payload.phone) : null,
          email: payload.email ? String(payload.email) : null,
          notes: payload.notes ? String(payload.notes) : null,
          city: payload.city ? String(payload.city) : null,
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
        sessionId: payloadSessionId || current.sessionId,
        actorExternalId: payload.actorExternalId ? String(payload.actorExternalId) : current.actorExternalId,
        objectType: payload.objectType ? String(payload.objectType) : current.objectType,
        sourceChannel:
          payload.sourceChannel !== undefined
            ? payload.sourceChannel
              ? String(payload.sourceChannel)
              : null
            : current.sourceChannel,
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

  const loadThreads = async () => {
    setLoadingThreads(true);
    setError(null);
    try {
      const data = sortThreads(await listMetaInboxThreads(100, 0));
      setThreads(data);
      if (!selectedActorKey && data.length > 0) {
        setSelectedActorKey(actorKey(data[0].actorExternalId, data[0].objectType));
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
    if (!selectedThread?.sessionId) return;
    loadMessages(selectedThread.sessionId);
  }, [selectedThread?.sessionId]);

  useEffect(() => {
    if (!selectedThread) return;
    setContactForm({
      displayName: selectedThread.displayName || "",
      phone: selectedThread.phone || "",
      email: selectedThread.email || "",
      notes: selectedThread.notes || "",
      city: selectedThread.city || "",
    });
  }, [selectedThread]);

  useEffect(() => {
    onMetaInboxThreadUpsert((payload) => {
      mergeThread(payload as InboxRealtimePayload);
    });

    onMetaInboxMessageNew((payload) => {
      const data = payload as InboxRealtimePayload;
      mergeThread(data);

      const payloadKey = getPayloadActorKey(data);
      if (!payloadKey || payloadKey !== selectedActorKey) return;
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
  }, [selectedActorKey, selectedThread?.sessionId, selectedThread?.actorExternalId, selectedThread?.objectType]);

  const handleSaveContact = async () => {
    if (!selectedThread?.sessionId) return;
    setSavingContact(true);
    setError(null);
    try {
      const normalizedContact: MetaInboxContactUpdate = {
        displayName: contactForm.displayName?.trim() || undefined,
        phone: contactForm.phone?.trim() || undefined,
        email: contactForm.email?.trim() || undefined,
        notes: contactForm.notes?.trim() || undefined,
        city: contactForm.city?.trim() || undefined,
      };

      await updateMetaInboxContact(selectedThread.sessionId, normalizedContact);
      mergeThread({
        sessionId: selectedThread.sessionId,
        actorExternalId: selectedThread.actorExternalId,
        objectType: selectedThread.objectType,
        displayName: normalizedContact.displayName,
        phone: normalizedContact.phone,
        email: normalizedContact.email,
        notes: normalizedContact.notes,
        city: normalizedContact.city,
      });
    } catch (e: any) {
      setError(e?.message || "Error guardando contacto");
    } finally {
      setSavingContact(false);
    }
  };

  const handleSend = async () => {
    if (!selectedThread?.sessionId || !draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      const text = draft.trim();
      setDraft("");
      const result = await sendMetaInboxText(selectedThread.sessionId, text);

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

  const handleSendMedia = async (file: File) => {
    if (!selectedThread?.sessionId) return;
    setSending(true);
    setError(null);
    try {
      const result = await sendMetaInboxMedia(selectedThread.sessionId, file);
      const mediaType = String(result?.mediaType || "").toLowerCase() === "audio" ? "audio" : "image";
      const mediaUrl = normalizeMediaUrl(result?.mediaUrl ? String(result.mediaUrl) : "");
      const placeholder = mediaType === "audio" ? "[audio]" : "[imagen]";

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
            contentText: placeholder,
            contentJson: {
              mediaType,
              mediaUrl,
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
        lastMessageText: placeholder,
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
    <div className={estilos.metaInbox.pagina}>
      <header className={estilos.metaInbox.header}>
        <div className={estilos.metaInbox.headerLeft}>
          <h1 className={estilos.metaInbox.titulo}>Meta Inbox</h1>
          <button
            onClick={() => navigate("/kanban")}
            className={estilos.floatingChat.botonEnviar}
            aria-label="Volver"
            title="Volver"
          >
            <ArrowLeft size={16} />
          </button>
          <button
            onClick={loadThreads}
            className={estilos.floatingChat.botonEnviar}
            aria-label="Actualizar"
            title="Actualizar"
          >
            <RefreshCcw size={16} />
          </button>
        </div>
        <div />
      </header>

      {error && <div className={estilos.metaInbox.errorBanner}>{error}</div>}

      <main
        className={`${estilos.metaInbox.mainBase} ${
          showContactPanel ? estilos.metaInbox.mainWithContact : estilos.metaInbox.mainWithoutContact
        }`}
      >
        <section className={estilos.metaInbox.sidebar}>
          <div className={estilos.metaInbox.sidebarInfo}>
            {loadingThreads ? "Cargando conversaciones..." : `${threads.length} conversaciones`}
          </div>

          {threads.map((thread) => {
            const key = actorKey(thread.actorExternalId, thread.objectType);
            const active = key === selectedActorKey;
            return (
              <div
                key={key}
                className={`${estilos.metaInbox.threadItem} ${
                  active ? estilos.metaInbox.threadItemActive : ""
                }`}
              >
                <div className={estilos.metaInbox.threadRow}>
                  <button onClick={() => setSelectedActorKey(key)} className={estilos.metaInbox.threadMainButton}>
                    <div className={estilos.metaInbox.threadTop}>
                      <span className={estilos.metaInbox.threadName}>{thread.displayName || "Nuevo"}</span>
                      <span className={estilos.metaInbox.threadTime}>
                        {formatRelativeTs(thread.lastMessageAt)}
                      </span>
                    </div>
                    <div className={estilos.metaInbox.threadPreview}>{thread.lastMessageText || "(sin texto)"}</div>
                    <div className={estilos.metaInbox.threadMeta}>
                      <ChannelIcon
                        objectType={thread.objectType}
                        className="inline-block w-3.5 h-3.5"
                      />
                    </div>
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuForKey((prev) => (prev === key ? null : key))}
                      className={estilos.metaInbox.menuButton}
                      aria-label="menu actor"
                    >
                      <MoreVertical size={14} />
                    </button>
                    {openMenuForKey === key && (
                      <div className={estilos.metaInbox.menuPopup}>
                        <button
                          onClick={() => {
                            setSelectedActorKey(key);
                            setContactActorKey(key);
                            setOpenMenuForKey(null);
                          }}
                          className={estilos.metaInbox.menuOption}
                        >
                          Ver contacto
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className={estilos.metaInbox.chatPanel}>
          {!selectedThread ? (
            <div className={estilos.metaInbox.emptyState}>
              Selecciona una conversación
            </div>
          ) : (
            <>
              <div className={estilos.metaInbox.chatHeader}>
                <div className={estilos.metaInbox.chatHeaderRow}>
                  <div>
                    <div className={estilos.metaInbox.chatName}>{selectedThread.displayName || "Nuevo"}</div>
                    <div className={estilos.metaInbox.chatChannel}>
                      <ChannelIcon
                        objectType={selectedThread.objectType}
                        className="inline-block w-3.5 h-3.5"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedActorKey(null);
                      setContactActorKey(null);
                      setMessages([]);
                    }}
                    className={estilos.metaInbox.closeButton}
                    aria-label="Cerrar chat"
                    title="Cerrar chat"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className={estilos.metaInbox.messagesArea}>
                {loadingMessages && <div className={estilos.metaInbox.loadingText}>Cargando mensajes...</div>}
                {!loadingMessages &&
                  messages.map((msg) => {
                    const outgoing = msg.direction === "OUTGOING";
                    const media = extractMedia(msg.contentJson);
                    return (
                      <div
                        key={msg.externalEventId}
                        className={outgoing ? estilos.metaInbox.bubbleWrapOutgoing : estilos.metaInbox.bubbleWrapIncoming}
                      >
                        <div
                          className={outgoing ? estilos.metaInbox.bubbleOutgoing : estilos.metaInbox.bubbleIncoming}
                        >
                          {media?.mediaType === "image" && (
                            <img
                              src={media.mediaUrl}
                              alt="imagen"
                              className="max-w-[220px] rounded-md border border-borde mb-1"
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
                          <div className={outgoing ? estilos.metaInbox.bubbleTsOutgoing : estilos.metaInbox.bubbleTsIncoming}>
                            {formatRelativeTs(msg.occurredAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className={estilos.metaInbox.composer}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Escribe un mensaje..."
                  className={estilos.metaInbox.composerInput}
                />
                <label className={estilos.floatingChat.botonEnviar} aria-label="Adjuntar imagen" title="Adjuntar imagen">
                  <ImagePlus className={estilos.floatingChat.icon} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSendMedia(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                <button
                  onClick={() => setShowRecorder((prev) => !prev)}
                  className={estilos.floatingChat.botonEnviar}
                  aria-label="Grabar audio"
                  title="Grabar audio"
                >
                  <Mic className={estilos.floatingChat.icon} />
                </button>
                <button
                  onClick={handleSend}
                  className={estilos.floatingChat.botonEnviar}
                  aria-label="Enviar"
                  title="Enviar"
                >
                  <Send className={estilos.floatingChat.icon} />
                </button>
              </div>
              {showRecorder && (
                <div className="px-3 pb-3 bg-fondoCard/40 backdrop-blur-sm border-t border-borde">
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
          <aside className={estilos.metaInbox.contactAside}>
            <div className={estilos.metaInbox.contactHead}>
              <h2 className={estilos.metaInbox.contactTitle}>Contacto</h2>
              <button
                onClick={() => setContactActorKey(null)}
                className={estilos.metaInbox.closeButton}
                aria-label="Cerrar contacto"
                title="Cerrar contacto"
              >
                <X size={16} />
              </button>
            </div>
            <input
              value={contactForm.displayName || ""}
              onChange={(e) => setContactForm((prev) => ({ ...prev, displayName: e.target.value }))}
              placeholder="Nombre"
              className={estilos.metaInbox.contactInput}
              disabled={!selectedThread}
            />
            <input
              value={contactForm.phone || ""}
              onChange={(e) => setContactForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Teléfono"
              className={estilos.metaInbox.contactInput}
              disabled={!selectedThread}
            />
            <input
              value={contactForm.city || ""}
              onChange={(e) => setContactForm((prev) => ({ ...prev, city: e.target.value }))}
              placeholder="Ciudad"
              className={estilos.metaInbox.contactInput}
              disabled={!selectedThread}
            />
            <input
              value={contactForm.email || ""}
              onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email"
              className={estilos.metaInbox.contactInput}
              disabled={!selectedThread}
            />
            <textarea
              value={contactForm.notes || ""}
              onChange={(e) => setContactForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Notas"
              className={estilos.metaInbox.contactTextarea}
              disabled={!selectedThread}
            />
            <button
              onClick={handleSaveContact}
              disabled={!selectedThread || savingContact}
              className={estilos.metaInbox.contactSave}
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
