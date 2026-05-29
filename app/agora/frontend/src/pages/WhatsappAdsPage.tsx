import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, ExternalLink, Megaphone, UsersRound } from "lucide-react";
import { listWhatsappAdLeadStats, listFcaMarketplaceLeadStats } from "@/services/metaInbox.service";
import type { WhatsappAdLeadRow, WhatsappAdLeadStatsItem, FcaMarketplaceLeadStatsItem, FcaMarketplaceLeadRow } from "@/types/metaInbox";

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

  const [fcaAds, setFcaAds] = useState<FcaMarketplaceLeadStatsItem[]>([]);
  const [fcaLeads, setFcaLeads] = useState<FcaMarketplaceLeadRow[]>([]);
  const [fcaPage, setFcaPage] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [waData, fcaData] = await Promise.all([
          listWhatsappAdLeadStats(),
          listFcaMarketplaceLeadStats(),
        ]);
        setAds(waData.items || []);
        setLeads(waData.leads || []);
        setPage(0);
        setFcaAds(fcaData.items || []);
        setFcaLeads(fcaData.leads || []);
        setFcaPage(0);
      } catch (err) {
        console.error("Error cargando ads:", err);
        setError("No se pudo cargar la estadística de anuncios.");
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

  const fcaCurrent = fcaAds[fcaPage] || null;
  const fcaCurrentLeads = useMemo(
    () => fcaLeads.filter((lead) => lead.sourceId === fcaCurrent?.sourceId),
    [fcaCurrent?.sourceId, fcaLeads],
  );

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
                className="rounded-xl border border-border bg-input p-3 text-secondary-foreground hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
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
                className="rounded-xl border border-border bg-input p-3 text-secondary-foreground hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
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
                <div className="text-[10px] md:text-xs font-medium uppercase tracking-[0.14em] md:tracking-[0.18em] text-muted-foreground">Eventos</div>
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
                  <div key={`${lead.sourceId}-${lead.sessionId}`} className="border-b border-border p-4 last:border-b-0">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="break-all font-mono text-xs text-primary/70">{lead.actorExternalId || lead.pnJid || lead.lidJid || "sin actor"}</div>
                        <div className="mt-1 truncate text-sm text-secondary-foreground">{lead.firstMessageText || "(sin texto inicial)"}</div>
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

      {/* ── Sección Marketplace Facebook ── */}
      <div className="rounded-3xl border border-border bg-card p-4 md:p-6">
        <div className="mb-4 flex items-center gap-3 text-blue-400">
          <UsersRound size={18} />
          <span className="text-xs font-black uppercase tracking-[0.28em]">Marketplace Facebook</span>
        </div>
        {fcaAds.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin artículos detectados aún. Los artículos aparecen cuando un comprador inicia una conversación desde un listing de Marketplace.</p>
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row">
            {/* Lista de artículos */}
            <div className="flex w-full flex-col gap-2 lg:w-56 lg:shrink-0">
              {fcaAds.map((ad, i) => (
                <button
                  key={ad.sourceId}
                  type="button"
                  onClick={() => setFcaPage(i)}
                  className={`rounded-xl border p-3 text-left transition-colors ${i === fcaPage ? "border-blue-400/60 bg-blue-500/10" : "border-border bg-background hover:border-blue-400/30"}`}
                >
                  <div className="truncate text-xs font-semibold text-foreground">{ad.title || ad.sourceId}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{ad.uniqueSessions} conv · {ad.seenCount} msgs</div>
                </button>
              ))}
            </div>

            {/* Detalle del artículo */}
            {fcaCurrent && (
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <div className="flex gap-4 rounded-2xl border border-border bg-background p-4">
                  {fcaCurrent.imageUrl && (
                    <img src={fcaCurrent.imageUrl} alt={fcaCurrent.title || "Artículo"} loading="lazy" className="h-24 w-24 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground">{fcaCurrent.title || "Sin título"}</div>
                    {fcaCurrent.description && <div className="mt-1 text-sm text-muted-foreground">{fcaCurrent.description}</div>}
                    {fcaCurrent.sourceUrl && (
                      <a href={fcaCurrent.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 text-xs text-blue-400 hover:underline">
                        <ExternalLink size={12} /> Ver en Marketplace
                      </a>
                    )}
                    <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                      <span>{fcaCurrent.uniqueSessions} conversaciones únicas</span>
                      <span>Primera vista: {formatDate(fcaCurrent.firstSeenAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between px-1">
                  <button type="button" onClick={() => setFcaPage((p) => Math.max(0, p - 1))} disabled={fcaPage === 0} className="rounded-lg border border-border bg-card p-1.5 hover:bg-accent disabled:opacity-30"><ChevronLeft size={16} /></button>
                  <span className="text-xs text-muted-foreground">{fcaPage + 1} / {fcaAds.length}</span>
                  <button type="button" onClick={() => setFcaPage((p) => Math.min(fcaAds.length - 1, p + 1))} disabled={fcaPage === fcaAds.length - 1} className="rounded-lg border border-border bg-card p-1.5 hover:bg-accent disabled:opacity-30"><ChevronRight size={16} /></button>
                </div>

                <div className="rounded-2xl border border-border bg-card">
                  <div className="border-b border-border p-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400">Conversaciones asociadas</h3>
                  </div>
                  <div className="max-h-[280px] overflow-auto">
                    {fcaCurrentLeads.map((lead) => (
                      <div key={`${lead.sourceId}-${lead.sessionId}`} className="border-b border-border p-4 last:border-b-0">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="break-all font-mono text-xs text-blue-400/70">{lead.actorExternalId || "sin actor"}</div>
                            <div className="mt-1 truncate text-sm text-secondary-foreground">{lead.firstMessageText || "(sin texto inicial)"}</div>
                          </div>
                          <div className="shrink-0 text-xs text-muted-foreground">{formatDate(lead.firstSeenAt)}</div>
                        </div>
                      </div>
                    ))}
                    {fcaCurrentLeads.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Sin conversaciones para este artículo.</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
