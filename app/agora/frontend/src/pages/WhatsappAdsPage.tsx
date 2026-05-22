import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, ExternalLink, Megaphone, UsersRound } from "lucide-react";
import { listWhatsappAdLeadStats } from "@/services/metaInbox.service";
import type { WhatsappAdLeadRow, WhatsappAdLeadStatsItem } from "@/types/metaInbox";

const formatDate = (value?: string | null) => {
  if (!value) return "sin registro";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sin registro";
  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const csvEscape = (value: unknown) => {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
};

const downloadCsv = (rows: WhatsappAdLeadRow[], ads: WhatsappAdLeadStatsItem[]) => {
  const bySource = new Map(ads.map((ad) => [ad.sourceId, ad]));
  const header = [
    "sourceId", "title", "sourceUrl", "thumbnailUrl", "originalImageUrl",
    "sessionId", "actorExternalId", "pnJid", "lidJid",
    "firstMessageText", "firstSeenAt", "lastSeenAt", "seenCount",
  ];
  const lines = [
    header.join(","),
    ...rows.map((row) => {
      const ad = bySource.get(row.sourceId);
      return [
        row.sourceId, ad?.title, ad?.sourceUrl, ad?.thumbnailUrl, ad?.originalImageUrl,
        row.sessionId, row.actorExternalId, row.pnJid, row.lidJid,
        row.firstMessageText, row.firstSeenAt, row.lastSeenAt, row.seenCount,
      ].map(csvEscape).join(",");
    }),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `whatsapp-ad-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export default function WhatsappAdsPage() {
  const [ads, setAds] = useState<WhatsappAdLeadStatsItem[]>([]);
  const [leads, setLeads] = useState<WhatsappAdLeadRow[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await listWhatsappAdLeadStats();
        setAds(data.items || []);
        setLeads(data.leads || []);
        setPage(0);
      } catch (err) {
        console.error("Error cargando ads WhatsApp:", err);
        setError("No se pudo cargar la estadística de anuncios WhatsApp.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const current = ads[page] || null;
  const currentLeads = useMemo(
    () => leads.filter((lead) => lead.sourceId === current?.sourceId),
    [current?.sourceId, leads],
  );
  const totalUnique = ads.reduce((acc, item) => acc + Number(item.uniqueSessions || 0), 0);
  const totalSeen = ads.reduce((acc, item) => acc + Number(item.seenCount || 0), 0);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-120px)] w-full max-w-7xl flex-col gap-4 md:gap-6 text-foreground">
      <header className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 md:p-6 md:shadow-[0_24px_80px_rgba(0,0,0,0.28)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3 text-primary">
            <Megaphone size={20} />
            <span className="text-xs font-black uppercase tracking-[0.28em]">WhatsApp Ads</span>
          </div>
          <h1 className="mt-2 md:mt-3 text-2xl md:text-3xl font-black tracking-tight text-foreground">Leads por anuncio</h1>
          <p className="mt-1 md:mt-2 max-w-2xl text-sm text-muted-foreground hidden sm:block">
            Una página por `sourceId` detectado en Baileys. El conteo único usa `sourceId + sessionId`.
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadCsv(leads, ads)}
          disabled={leads.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#6E3709] bg-[#1E1108] px-4 py-2.5 md:px-5 md:py-3 text-sm font-black uppercase tracking-[0.18em] text-primary transition hover:bg-[#321C0C] disabled:cursor-not-allowed disabled:opacity-50 self-start lg:self-auto shrink-0"
        >
          <Download size={16} />
          <span className="hidden sm:inline">Descargar CSV completo</span>
          <span className="sm:hidden">CSV</span>
        </button>
      </header>

      <section className="grid grid-cols-3 gap-3 md:gap-4">
        <div className="rounded-2xl border border-border bg-card p-3 md:p-5">
          <div className="text-[10px] md:text-xs font-medium uppercase tracking-[0.14em] md:tracking-[0.18em] text-muted-foreground">Anuncios</div>
          <div className="mt-1 md:mt-2 text-2xl md:text-4xl font-black text-foreground">{ads.length}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 md:p-5">
          <div className="text-[10px] md:text-xs font-medium uppercase tracking-[0.14em] md:tracking-[0.18em] text-muted-foreground">Únicos</div>
          <div className="mt-1 md:mt-2 text-2xl md:text-4xl font-black text-primary">{totalUnique}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 md:p-5">
          <div className="text-[10px] md:text-xs font-medium uppercase tracking-[0.14em] md:tracking-[0.18em] text-muted-foreground">Eventos</div>
          <div className="mt-1 md:mt-2 text-2xl md:text-4xl font-black text-foreground">{totalSeen}</div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>}
      {loading && <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">Cargando anuncios...</div>}

      {!loading && !current && (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
          Aún no hay leads con `externalAdReply` registrado.
        </div>
      )}

      {current && (
        <main className="grid flex-1 gap-6 lg:grid-cols-[minmax(320px,430px)_1fr]">
          <article className="overflow-hidden rounded-[2rem] border border-border bg-card md:shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#28160A] text-sm font-black text-primary">
                  AD
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">llevatuplancl</div>
                  <div className="text-xs text-muted-foreground">Anuncio de Facebook hacia WhatsApp</div>
                </div>
              </div>
            </div>

            <div className="aspect-square bg-muted">
              {current.originalImageUrl || current.thumbnailUrl ? (
                <img
                  src={current.originalImageUrl || current.thumbnailUrl || ""}
                  alt={current.title || current.sourceId}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
                  Sin imagen guardada
                </div>
              )}
            </div>

            <div className="space-y-4 p-5">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Título</div>
                <h2 className="mt-1 text-xl font-black leading-tight text-foreground">{current.title || "Sin título"}</h2>
              </div>
              <div className="rounded-2xl border border-border bg-muted p-3 text-xs">
                <div className="text-muted-foreground">sourceId</div>
                <div className="mt-1 break-all font-mono text-primary/70">{current.sourceId}</div>
              </div>
              {current.sourceUrl && (
                <a
                  href={current.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/70 transition-colors"
                >
                  Abrir origen <ExternalLink size={15} />
                </a>
              )}
            </div>
          </article>

          <section className="flex min-w-0 flex-col gap-5">
            <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={page === 0}
                className="rounded-xl border border-border bg-input p-3 text-foreground/80 hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft />
              </button>
              <div className="text-center">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Página</div>
                <div className="text-lg font-black text-foreground">{page + 1} / {ads.length}</div>
              </div>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(ads.length - 1, prev + 1))}
                disabled={page >= ads.length - 1}
                className="rounded-xl border border-border bg-input p-3 text-foreground/80 hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="rounded-2xl border border-[#5C2E08] bg-[#1E1108] p-3 md:p-5">
                <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-medium uppercase tracking-[0.14em] md:tracking-[0.18em] text-primary/80">
                  <UsersRound size={13} />
                  Únicos
                </div>
                <div className="mt-2 md:mt-3 text-3xl md:text-5xl font-black text-primary">{current.uniqueSessions}</div>
              </div>
              <div className="rounded-2xl border border-foreground/20 bg-foreground/5 p-3 md:p-5">
                <div className="text-[10px] md:text-xs font-medium uppercase tracking-[0.14em] md:tracking-[0.18em] text-foreground/60">Eventos</div>
                <div className="mt-2 md:mt-3 text-3xl md:text-5xl font-black text-foreground">{current.seenCount}</div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-3 md:p-5">
                <div className="text-[10px] md:text-xs font-medium uppercase tracking-[0.14em] md:tracking-[0.18em] text-muted-foreground">Primer lead</div>
                <div className="mt-1 md:mt-2 text-xs md:text-sm font-bold text-foreground">{formatDate(current.firstSeenAt)}</div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-3 md:p-5">
                <div className="text-[10px] md:text-xs font-medium uppercase tracking-[0.14em] md:tracking-[0.18em] text-muted-foreground">Último lead</div>
                <div className="mt-1 md:mt-2 text-xs md:text-sm font-bold text-foreground">{formatDate(current.lastSeenAt)}</div>
              </div>
            </div>

            <div className="min-h-0 rounded-2xl border border-border bg-card">
              <div className="border-b border-border p-4">
                <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Conversaciones asociadas</h3>
              </div>
              <div className="max-h-[340px] overflow-auto">
                {currentLeads.map((lead) => (
                  <div key={`${lead.sourceId}-${lead.sessionId}`} className="border-b border-border/50 p-4 last:border-b-0">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="break-all font-mono text-xs text-primary/70">{lead.actorExternalId || lead.pnJid || lead.lidJid || "sin actor"}</div>
                        <div className="mt-1 truncate text-sm text-foreground/80">{lead.firstMessageText || "(sin texto inicial)"}</div>
                      </div>
                      <div className="shrink-0 text-xs text-muted-foreground">{formatDate(lead.firstSeenAt)}</div>
                    </div>
                  </div>
                ))}
                {currentLeads.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Sin filas para este anuncio.</div>}
              </div>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
