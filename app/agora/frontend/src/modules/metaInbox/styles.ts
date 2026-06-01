export const s = {
  pagina: "flex flex-1 flex-col overflow-hidden bg-background text-foreground",
  errorBanner:
    "sticky top-0 z-50 border-b border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-400",
  mainBase: "flex min-h-0 flex-1 overflow-hidden",
  mainWithContact: "grid grid-cols-[280px_1fr_320px]",
  mainWithoutContact: "grid grid-cols-[280px_1fr]",
  sidebar:
    "flex flex-col overflow-y-auto border-r border-border bg-card scrollbar-custom",
  sidebarInfo: "mt-2 text-[11px] text-muted-foreground",
  threadItem: "border-b border-border px-2 py-2 transition hover:bg-input",
  threadItemActive: "bg-input",
  threadRow: "flex items-start gap-1",
  threadMainButton: "min-w-0 flex-1 text-left",
  threadTop: "flex items-center justify-between gap-2",
  threadName: "text-sm font-bold text-foreground",
  threadTime: "text-[10px] text-muted-foreground",
  threadPreview: "text-xs text-muted-foreground",
  menuButton:
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-input hover:text-foreground",
  menuPopup:
    "absolute right-0 top-8 z-30 min-w-[140px] rounded-md border border-border bg-card shadow-xl",
  menuOption:
    "block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-input transition-colors",
  chatPanel: "flex min-h-0 flex-1 flex-col overflow-hidden",
  chatHeader: "border-b border-border bg-card px-4 py-3",
  chatHeaderRow: "flex items-start justify-between gap-2",
  chatName: "text-base font-bold text-foreground",
  closeButton:
    "flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:border-rose-400/30 hover:text-rose-400 transition-colors",
  messagesArea: "flex-1 overflow-y-auto space-y-2 p-4 scrollbar-custom",
  loadingText: "py-4 text-center text-sm text-muted-foreground",
  bubbleWrapOutgoing: "flex justify-end",
  bubbleWrapIncoming: "flex justify-start",
  bubbleOutgoing:
    "max-w-[75%] rounded-2xl rounded-tr-sm border border-border bg-[var(--bubble-outgoing)] px-3 py-2 text-sm text-foreground",
  bubbleIncoming:
    "max-w-[75%] rounded-2xl rounded-tl-sm border border-border bg-card px-3 py-2 text-sm text-foreground",
  bubbleTsOutgoing: "mt-1 text-right text-[10px] text-muted-foreground",
  bubbleTsIncoming: "mt-1 text-[10px] text-muted-foreground",
  composer:
    "flex items-end gap-2 border-t border-border bg-card px-3 py-2",
  composerInput:
    "min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground resize-none overflow-hidden leading-5",
  composerSend:
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors",
  composerIcon: "h-4 w-4",
  contactAside:
    "flex flex-col gap-2 overflow-y-auto border-l border-border bg-card p-3 scrollbar-custom",
  contactHead: "flex items-center justify-between pb-2 border-b border-border",
  contactTitle:
    "text-sm font-medium text-foreground",
  contactInput:
    "w-full rounded-md border border-border bg-input px-2 py-1.5 text-sm text-foreground outline-none focus:border-border transition disabled:opacity-60",
  contactTextarea:
    "w-full rounded-md border border-border bg-input px-2 py-1.5 text-sm text-foreground outline-none focus:border-border transition disabled:opacity-60 min-h-[72px] resize-none",
  contactSave:
    "flex items-center justify-center gap-2 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition disabled:cursor-not-allowed disabled:opacity-60",
  tagActive:
    "rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground transition-colors",
  tagInactive:
    "rounded-full border border-border bg-input px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground",
  catalogInput:
    "w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-border transition",
};
