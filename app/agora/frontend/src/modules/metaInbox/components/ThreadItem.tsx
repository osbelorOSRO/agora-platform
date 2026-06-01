import React from "react";
import { MoreVertical, ShoppingBag } from "lucide-react";
import type { MetaInboxThread } from "@/types/metaInbox";
import { compactActorId, formatRelativeTs, normalizeText, stageLabel } from "../utils";
import { s } from "../styles";
import { ChannelIcon, channelClass } from "./ChannelIcon";
import { AttentionIcon, attentionClass } from "./AttentionIcon";

interface Props {
  thread: MetaInboxThread;
  active: boolean;
  menuOpen: boolean;
  onSelect: () => void;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onViewDetail: () => void;
  onReopen: () => void;
}

export const ThreadItem: React.FC<Props> = ({
  thread,
  active,
  menuOpen,
  onSelect,
  onOpenMenu,
  onCloseMenu,
  onViewDetail,
  onReopen,
}) => {
  const attentionMode = String(thread.attentionMode || "N8N").toUpperCase();
  const actorLabel = compactActorId(thread);
  const hasUsefulName = !!thread.displayName && normalizeText(thread.displayName) !== "nuevo";
  const title = hasUsefulName ? thread.displayName : actorLabel || "Nuevo";
  const subtitle = hasUsefulName && actorLabel ? actorLabel : "";
  const stage = stageLabel(thread.threadStage);

  const marketplaceTitle = (() => {
    if (String(thread.objectType || "").toUpperCase() !== "FACEBOOK") return null;
    const mp = (thread.metadata as Record<string, unknown> | null | undefined)?.["marketplace"] as
      | Record<string, unknown>
      | undefined;
    return typeof mp?.title === "string" ? mp.title : null;
  })();

  const channelLabel = (() => {
    const t = String(thread.objectType || "PAGE").toUpperCase();
    if (t === "FACEBOOK") return "Facebook";
    if (t === "WHATSAPP") return "WhatsApp";
    if (t === "INSTAGRAM") return "Instagram";
    if (t === "PAGE") return "Fan Page";
    return t;
  })();

  const isArchivedOrClosed =
    thread.threadStatus === "ARCHIVED" || thread.threadStatus === "CLOSED";

  return (
    <div
      className={`${s.threadItem} ${active ? s.threadItemActive : ""} [content-visibility:auto] [contain-intrinsic-size:0_72px]`}
    >
      <div className={s.threadRow}>
        <button onClick={onSelect} className={s.threadMainButton}>
          <div className="flex min-w-0 items-start gap-2">
            <span
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${channelClass(thread.objectType)}`}
              title={channelLabel}
            >
              <ChannelIcon objectType={thread.objectType} className="h-4 w-4" />
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
              {marketplaceTitle && (
                <div className="mt-1 flex min-w-0 items-center gap-1">
                  <ShoppingBag className="h-3 w-3 shrink-0 text-blue-400" />
                  <span className="min-w-0 truncate text-[10px] text-blue-300">{marketplaceTitle}</span>
                </div>
              )}
              <div className="mt-2 flex min-w-0 items-center gap-1.5">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${attentionClass(attentionMode)}`}
                  title={attentionMode}
                >
                  <AttentionIcon mode={attentionMode} className="h-3.5 w-3.5" />
                </span>
                <span
                  className="min-w-0 truncate rounded-md border border-border bg-secondary px-1.5 py-1 text-[10px] font-medium text-muted-foreground"
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
            onClick={menuOpen ? onCloseMenu : onOpenMenu}
            className={s.menuButton}
            aria-label="Opciones del hilo"
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div className={s.menuPopup}>
              <button onClick={onViewDetail} className={s.menuOption}>
                Ver detalle
              </button>
              {isArchivedOrClosed && (
                <button onClick={onReopen} className={s.menuOption}>
                  Nueva atencion
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
