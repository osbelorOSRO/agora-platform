import React from "react";
import { Search } from "lucide-react";
import type { MetaInboxThread } from "@/types/metaInbox";
import { ATTENTION_MODE_OPTIONS, STATUS_VIEWS, type StatusView } from "../constants";
import { statusIcon, statusLabel, threadMatchesStatus } from "../utils";
import { s } from "../styles";
import { ThreadItem } from "./ThreadItem";

interface Props {
  threads: MetaInboxThread[];
  filteredThreads: MetaInboxThread[];
  providers: string[];
  selectedSessionId: string | null;
  loadingThreads: boolean;
  statusView: StatusView;
  searchQuery: string;
  providerFilter: string;
  attentionFilter: string;
  openMenuForSessionId: string | null;
  mobileHidden: boolean;
  width?: number;
  onStatusChange: (v: StatusView) => void;
  onSearchChange: (v: string) => void;
  onProviderChange: (v: string) => void;
  onAttentionChange: (v: string) => void;
  onSelectThread: (sessionId: string) => void;
  onOpenMenu: (sessionId: string) => void;
  onCloseMenu: () => void;
  onViewDetail: (sessionId: string) => void;
  onReopen: (sessionId: string) => void;
}

export const ThreadSidebar: React.FC<Props> = ({
  threads,
  filteredThreads,
  providers,
  selectedSessionId,
  loadingThreads,
  statusView,
  searchQuery,
  providerFilter,
  attentionFilter,
  openMenuForSessionId,
  mobileHidden,
  width,
  onStatusChange,
  onSearchChange,
  onProviderChange,
  onAttentionChange,
  onSelectThread,
  onOpenMenu,
  onCloseMenu,
  onViewDetail,
  onReopen,
}) => {
  return (
    <section
      className={
        mobileHidden
          ? "hidden"
          : `flex flex-col overflow-y-auto border-r border-border bg-card scrollbar-custom ${width !== undefined ? "shrink-0" : "flex-1 min-w-0"}`
      }
      style={width !== undefined ? { width } : undefined}
    >
      <div className="sticky top-0 z-20 border-b border-border bg-card p-3">
        <div className="grid grid-cols-3 gap-1">
          {STATUS_VIEWS.map((view) => {
            const Icon = statusIcon(view);
            const count = threads.filter((t) => threadMatchesStatus(t, view)).length;
            const active = statusView === view;
            return (
              <button
                key={view}
                onClick={() => onStatusChange(view)}
                className={`flex h-9 items-center justify-center gap-1.5 rounded-md border text-[11px] font-medium transition ${
                  active
                    ? "border-primary bg-secondary text-foreground"
                    : "border-border bg-input text-muted-foreground hover:border-border hover:text-foreground"
                }`}
                title={statusLabel(view)}
                aria-pressed={active}
                aria-label={statusLabel(view)}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex h-9 items-center gap-2 rounded-md border border-border bg-input px-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar actor, mensaje, etapa..."
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Buscar conversaciones"
          />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <select
            value={providerFilter}
            onChange={(e) => onProviderChange(e.target.value)}
            className="h-8 rounded-md border border-border bg-input px-2 text-xs text-foreground outline-none"
            aria-label="Filtrar por canal"
          >
            <option value="ALL">Todos</option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {p === "FACEBOOK"
                  ? "Facebook"
                  : p === "PAGE"
                    ? "Fan Page"
                    : p === "INSTAGRAM"
                      ? "Instagram"
                      : p === "WHATSAPP"
                        ? "WhatsApp"
                        : p}
              </option>
            ))}
          </select>
          <select
            value={attentionFilter}
            onChange={(e) => onAttentionChange(e.target.value)}
            className="h-8 rounded-md border border-border bg-input px-2 text-xs text-foreground outline-none"
            aria-label="Filtrar por modo de atención"
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
          {loadingThreads
            ? "Cargando conversaciones..."
            : `${filteredThreads.length}/${threads.length} conversaciones`}
        </div>
      </div>

      {filteredThreads.map((thread) => (
        <ThreadItem
          key={thread.sessionId}
          thread={thread}
          active={thread.sessionId === selectedSessionId}
          menuOpen={openMenuForSessionId === thread.sessionId}
          onSelect={() => onSelectThread(thread.sessionId)}
          onOpenMenu={() => onOpenMenu(thread.sessionId)}
          onCloseMenu={onCloseMenu}
          onViewDetail={() => {
            onViewDetail(thread.sessionId);
            onCloseMenu();
          }}
          onReopen={() => {
            onViewDetail(thread.sessionId);
            onCloseMenu();
            onReopen(thread.sessionId);
          }}
        />
      ))}

      {!loadingThreads && filteredThreads.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          Sin conversaciones en esta vista
        </div>
      )}
    </section>
  );
};
