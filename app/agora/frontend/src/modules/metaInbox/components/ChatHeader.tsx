import React from "react";
import { X } from "lucide-react";
import type { MetaInboxThread } from "@/types/metaInbox";
import { compactActorId, normalizeText, stageLabel } from "../utils";
import { s } from "../styles";
import { ChannelIcon, channelClass } from "./ChannelIcon";
import { AttentionIcon, attentionClass } from "./AttentionIcon";

interface Props {
  thread: MetaInboxThread;
  blocked: boolean;
  onClose: () => void;
}

export const ChatHeader: React.FC<Props> = ({ thread, blocked, onClose }) => {
  const displayTitle =
    normalizeText(thread.displayName) !== "nuevo"
      ? thread.displayName
      : compactActorId(thread) || "Nuevo";

  const objectLabel = (() => {
    const t = String(thread.objectType || "PAGE").toUpperCase();
    if (t === "FACEBOOK") return "Facebook";
    if (t === "WHATSAPP") return "WhatsApp";
    if (t === "INSTAGRAM") return "Instagram";
    if (t === "PAGE") return "Fan Page";
    return t;
  })();

  return (
    <div className={s.chatHeader}>
      <div className={s.chatHeaderRow}>
        <div>
          <div className={s.chatName}>{displayTitle}</div>
          <div className="mt-2 flex items-center gap-2.5">
            <span
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${channelClass(thread.objectType)}`}
              title={objectLabel}
            >
              <ChannelIcon objectType={thread.objectType} className="h-4 w-4" />
            </span>
            <span
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${attentionClass(thread.attentionMode)}`}
              title={thread.attentionMode}
            >
              <AttentionIcon mode={thread.attentionMode} className="h-4 w-4" />
            </span>
            <span className="inline-flex h-8 items-center rounded-md border border-border bg-secondary px-2.5 text-xs font-medium text-foreground">
              {stageLabel(thread.threadStage)}
            </span>
            {blocked && (
              <span className="inline-flex h-8 items-center rounded-md border border-rose-400/60 bg-rose-500/15 px-2.5 text-xs font-bold text-rose-200">
                Bloqueado
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className={s.closeButton}
          aria-label="Cerrar chat"
          title="Cerrar chat"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
