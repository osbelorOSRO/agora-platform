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
    "sourceId",
    "title",
    "sourceUrl",
    "thumbnailUrl",
    "originalImageUrl",
    "sessionId",
    "actorExternalId",
    "pnJid",
    "lidJid",
    "firstMessageText",
    "firstSeenAt",
    "lastSeenAt",
    "seenCount",
  ];
  const lines = [
    header.join(","),
    ...rows.map((row) => {
      const ad = bySource.get(row.sourceId);
      return [
        row.sourceId,
        ad?.title,
        ad?.sourceUrl,
        ad?.thumbnailUrl,
        ad?.originalImageUrl,
        row.sessionId,
        row.actorExternalId,
        row.pnJid,
        row.lidJid,
        row.firstMessageText,
        row.firstSeenAt,
        row.lastSeenAt,
        row.seenCount,
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
    <div className="mx-auto flex min-h-[calc(100vh-120px)] w-full max-w-7xl flex-col gap-6 text-white">
      <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3 text-[#6dfe9c]">
            <Megaphone size={22} />
            <span className="text-xs font-black uppercase tracking-[0.28em]">WhatsApp Ads</span>
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Leads por anuncio</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Una página por `sourceId` detectado en Baileys. El conteo único usa `sourceId + sessionId`.
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadCsv(leads, ads)}
          disabled={leads.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#6dfe9c]/30 bg-[#6dfe9c]/10 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#6dfe9c] transition hover:bg-[#6dfe9c]/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={18} />
          Descargar CSV completo
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#071b21] p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Anuncios detectados</div>
          <div className="mt-2 text-4xl font-black text-white">{ads.length}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#071b21] p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Personas únicas</div>
          <div className="mt-2 text-4xl font-black text-[#6dfe9c]">{totalUnique}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#071b21] p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Eventos con contexto ad</div>
          <div className="mt-2 text-4xl font-black text-[#7ce6ff]">{totalSeen}</div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</div>}
      {loading && <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">Cargando anuncios...</div>}

      {!loading && !current && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">
          Aún no hay leads con `externalAdReply` registrado.
        </div>
      )}

      {current && (
        <main className="grid flex-1 gap-6 lg:grid-cols-[minmax(320px,430px)_1fr]">
          <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1f27] shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <div className="border-b border-white/10 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6dfe9c]/15 text-sm font-black text-[#6dfe9c]">
                  AD
                </div>
                <div>
                  <div className="text-sm font-bold">llevatuplancl</div>
                  <div className="text-xs text-slate-500">Anuncio de Facebook hacia WhatsApp</div>
                </div>
              </div>
            </div>

            <div className="aspect-square bg-[#06151a]">
              {current.originalImageUrl || current.thumbnailUrl ? (
                <img
                  src={current.originalImageUrl || current.thumbnailUrl || ""}
                  alt={current.title || current.sourceId}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-center text-slate-500">
                  Sin imagen guardada
                </div>
              )}
            </div>

            <div className="space-y-4 p-5">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Título</div>
                <h2 className="mt-1 text-xl font-black leading-tight">{current.title || "Sin título"}</h2>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
                <div className="text-slate-500">sourceId</div>
                <div className="mt-1 break-all font-mono text-[#7ce6ff]">{current.sourceId}</div>
              </div>
              {current.sourceUrl && (
                <a
                  href={current.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#6dfe9c] hover:text-[#7ce6ff]"
                >
                  Abrir origen <ExternalLink size={15} />
                </a>
              )}
            </div>
          </article>

          <section className="flex min-w-0 flex-col gap-5">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={page === 0}
                className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft />
              </button>
              <div className="text-center">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Página</div>
                <div className="text-lg font-black">{page + 1} / {ads.length}</div>
              </div>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(ads.length - 1, prev + 1))}
                disabled={page >= ads.length - 1}
                className="rounded-xl border border-white/10 bg-white/5 p-3 text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#6dfe9c]/20 bg-[#6dfe9c]/10 p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[#6dfe9c]/80">
                  <UsersRound size={16} />
                  Personas únicas
                </div>
                <div className="mt-3 text-5xl font-black text-[#6dfe9c]">{current.uniqueSessions}</div>
              </div>
              <div className="rounded-2xl border border-[#7ce6ff]/20 bg-[#7ce6ff]/10 p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-[#7ce6ff]/80">Eventos registrados</div>
                <div className="mt-3 text-5xl font-black text-[#7ce6ff]">{current.seenCount}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#071b21] p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Primer lead</div>
                <div className="mt-2 text-sm font-bold text-white">{formatDate(current.firstSeenAt)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#071b21] p-5">
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Último lead</div>
                <div className="mt-2 text-sm font-bold text-white">{formatDate(current.lastSeenAt)}</div>
              </div>
            </div>

            <div className="min-h-0 rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="border-b border-white/10 p-4">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Conversaciones asociadas</h3>
              </div>
              <div className="max-h-[340px] overflow-auto">
                {currentLeads.map((lead) => (
                  <div key={`${lead.sourceId}-${lead.sessionId}`} className="border-b border-white/5 p-4 last:border-b-0">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="break-all font-mono text-xs text-[#7ce6ff]">{lead.actorExternalId || lead.pnJid || lead.lidJid || "sin actor"}</div>
                        <div className="mt-1 truncate text-sm text-slate-300">{lead.firstMessageText || "(sin texto inicial)"}</div>
                      </div>
                      <div className="shrink-0 text-xs text-slate-500">{formatDate(lead.firstSeenAt)}</div>
                    </div>
                  </div>
                ))}
                {currentLeads.length === 0 && <div className="p-6 text-center text-sm text-slate-500">Sin filas para este anuncio.</div>}
              </div>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
