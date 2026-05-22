import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ContactRound,
  Facebook,
  Instagram,
  MessageCircle,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  createWhatsappContact,
  ensureWhatsappThread,
  listMetaInboxContacts,
} from "@/services/metaInbox.service";
import type {
  CreateWhatsappContactInput,
  MetaInboxDirectoryContact,
  MetaInboxDirectoryContactsResponse,
} from "@/types/metaInbox";

const PAGE_SIZE = 24;
const PROVIDERS = ["ALL", "WHATSAPP", "INSTAGRAM", "PAGE"] as const;

const providerLabel = (value: string) => {
  if (value === "ALL") return "Todos";
  if (value === "WHATSAPP") return "WhatsApp";
  if (value === "INSTAGRAM") return "Instagram";
  return "Page";
};

const stageLabel = (value?: string | null) =>
  String(value || "sin_thread")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatRelativeTs = (value?: string | null) => {
  if (!value) return "sin actividad";
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return "sin actividad";
  const deltaSec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (deltaSec < 60) return "hace 1 min";
  const deltaMin = Math.floor(deltaSec / 60);
  if (deltaMin < 60) return `hace ${deltaMin} min`;
  const deltaH = Math.floor(deltaMin / 60);
  if (deltaH < 24) return `hace ${deltaH} h`;
  return `hace ${Math.floor(deltaH / 24)} d`;
};

const compactActorId = (contact: MetaInboxDirectoryContact) => {
  if (contact.phone) return contact.phone;
  const jidPhone = contact.actorExternalId.match(/^(\d{8,15})@/)?.[1];
  if (jidPhone) return jidPhone;
  if (contact.actorExternalId.length > 24) {
    return `${contact.actorExternalId.slice(0, 10)}...${contact.actorExternalId.slice(-8)}`;
  }
  return contact.actorExternalId;
};

const ContactProviderIcon = ({ objectType, className }: { objectType: string; className?: string }) => {
  if (objectType === "WHATSAPP") return <MessageCircle className={className} />;
  if (objectType === "INSTAGRAM") return <Instagram className={className} />;
  return <Facebook className={className} />;
};

const providerClass = (objectType: string) => {
  if (objectType === "WHATSAPP") return "border-emerald-300/60 bg-emerald-400/15 text-emerald-300";
  if (objectType === "INSTAGRAM") return "border-fuchsia-300/60 bg-fuchsia-400/15 text-fuchsia-300";
  return "border-sky-300/60 bg-sky-400/15 text-sky-300";
};

const emptyWhatsappForm: CreateWhatsappContactInput = {
  phone: "",
  displayName: "",
  email: "",
  rut: "",
  city: "",
  notes: "",
};

const fieldInput = "h-11 rounded-md border border-border bg-input px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/40 transition";

export default function Agenda() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]>("ALL");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<MetaInboxDirectoryContactsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preparingThreadFor, setPreparingThreadFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateWhatsapp, setShowCreateWhatsapp] = useState(false);
  const [whatsappForm, setWhatsappForm] = useState<CreateWhatsappContactInput>(emptyWhatsappForm);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [provider]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await listMetaInboxContacts({
          search,
          objectType: provider,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        });
        if (cancelled) return;
        setData(response);
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message ?? "No se pudo cargar la agenda.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [search, provider, page, refreshKey]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const handleCreateWhatsapp = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createWhatsappContact({
        ...whatsappForm,
        phone: whatsappForm.phone.trim(),
        displayName: whatsappForm.displayName?.trim() || undefined,
        email: whatsappForm.email?.trim() || undefined,
        rut: whatsappForm.rut?.trim() || undefined,
        city: whatsappForm.city?.trim() || undefined,
        notes: whatsappForm.notes?.trim() || undefined,
      });
      setShowCreateWhatsapp(false);
      setWhatsappForm(emptyWhatsappForm);
      setProvider("WHATSAPP");
      setRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      setError(err?.message ?? "No se pudo crear el contacto WhatsApp.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenInbox = async (contact: MetaInboxDirectoryContact) => {
    if (contact.lastThreadSessionId) {
      navigate(`/meta-inbox?sessionId=${encodeURIComponent(contact.lastThreadSessionId)}`);
      return;
    }
    if (contact.objectType !== "WHATSAPP") return;
    setPreparingThreadFor(contact.actorExternalId);
    setError(null);
    try {
      const thread = await ensureWhatsappThread(contact.actorExternalId);
      navigate(`/meta-inbox?sessionId=${encodeURIComponent(thread.sessionId)}`);
    } catch (err: any) {
      setError(err?.message ?? "No se pudo preparar la conversacion WhatsApp.");
    } finally {
      setPreparingThreadFor(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* ── Header con stats ── */}
        <section className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="hidden md:block max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-primary">
                Agenda
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-foreground">
                Contactos conversacionales
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Directorio de actores/contactos basado en Meta Inbox y Baileys. La agenda permite encontrar,
                clasificar y preparar contactos sin borrar registros.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-3 min-w-0">
              <div className="rounded-lg border border-border bg-muted px-3 md:px-5 py-3 md:py-4 min-w-0 overflow-hidden">
                <p className="text-[9px] md:text-[10px] font-medium uppercase tracking-[0.18em] md:tracking-[0.26em] text-muted-foreground truncate">Contactos</p>
                <p className="mt-1 md:mt-2 text-xl md:text-3xl font-black text-foreground">{total}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted px-3 md:px-5 py-3 md:py-4 min-w-0 overflow-hidden">
                <p className="text-[9px] md:text-[10px] font-medium uppercase tracking-[0.18em] md:tracking-[0.26em] text-muted-foreground truncate">Canal</p>
                <p className="mt-1 md:mt-2 truncate text-xs md:text-sm font-semibold text-foreground">{providerLabel(provider)}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted px-3 md:px-5 py-3 md:py-4 min-w-0 overflow-hidden">
                <p className="text-[9px] md:text-[10px] font-medium uppercase tracking-[0.18em] md:tracking-[0.26em] text-muted-foreground truncate">Búsqueda</p>
                <p className="mt-1 md:mt-2 truncate text-xs md:text-sm font-semibold text-foreground">{search || "Sin filtro"}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Filtros y grilla ── */}
        <section className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-xl">
          <div className="relative z-20 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid w-full gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-[14px] h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Buscar nombre, teléfono, rut, email o actor id..."
                  className="h-11 w-full rounded-md border border-border bg-input pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/40"
                />
              </div>
              <select
                value={provider}
                onChange={(event) => setProvider(event.target.value as (typeof PROVIDERS)[number])}
                className="h-11 rounded-md border border-border bg-input px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/40"
              >
                {PROVIDERS.map((item) => (
                  <option key={item} value={item}>{providerLabel(item)}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateWhatsapp(true)}
              className="inline-flex w-full xl:w-auto h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-primary/20 bg-[#1B122A] px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-[#25112D]"
            >
              <Plus size={16} />
              Nuevo contacto WhatsApp
            </button>
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="rounded-xl border border-dashed border-border bg-background px-6 py-12 text-center text-sm text-muted-foreground">
                Cargando agenda...
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-6 py-12 text-center text-sm text-rose-300">
                {error}
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-background px-6 py-12 text-center text-sm text-muted-foreground">
                No encontramos contactos con ese criterio.
              </div>
            ) : (
              <div className="grid gap-2 md:gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {items.map((contact) => {
                  const title =
                    contact.displayName?.trim() && contact.displayName !== "Nuevo"
                      ? contact.displayName
                      : compactActorId(contact);
                  const canOpenInbox = contact.objectType === "WHATSAPP" || !!contact.lastThreadSessionId;
                  const inboxLabel = contact.lastThreadSessionId
                    ? "Inbox"
                    : contact.objectType === "WHATSAPP"
                      ? "Iniciar"
                      : "Sin thread";
                  const preparing = preparingThreadFor === contact.actorExternalId;
                  return (
                    <article
                      key={`${contact.objectType}:${contact.actorExternalId}`}
                      className="rounded-xl border border-border bg-muted shadow-lg transition-colors hover:border-primary/20 hover:bg-card [content-visibility:auto] [contain-intrinsic-size:0_64px] md:[contain-intrinsic-size:0_180px]"
                    >
                      {/* ── Fila compacta — solo móvil ── */}
                      <div className="flex items-center gap-3 p-3 md:hidden">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${providerClass(contact.objectType)}`}
                          title={providerLabel(contact.objectType)}
                        >
                          <ContactProviderIcon objectType={contact.objectType} className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-foreground">{title || "Sin nombre"}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {contact.actorLifecycleState || "SIN_ESTADO"} · {stageLabel(contact.lastThreadStage)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleOpenInbox(contact)}
                          disabled={!canOpenInbox || preparing}
                          className="shrink-0 inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-primary/20 bg-[#1B122A] px-3 text-xs font-semibold text-foreground/80 transition-colors hover:border-primary/40 hover:bg-[#25112D] disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <MessageCircle size={13} />
                          {preparing ? "..." : inboxLabel}
                        </button>
                      </div>

                      {/* ── Tarjeta completa — solo desktop ── */}
                      <div className="hidden md:block p-4 md:p-5">
                        <div className="flex items-start gap-4">
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border ${providerClass(contact.objectType)}`}
                            title={providerLabel(contact.objectType)}
                          >
                            <ContactProviderIcon objectType={contact.objectType} className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-bold text-foreground">{title || "Sin nombre"}</p>
                            <p className="mt-1 truncate text-sm text-muted-foreground">{compactActorId(contact)}</p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 text-sm">
                          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-input px-3 py-2">
                            <span className="text-muted-foreground">Lifecycle</span>
                            <span className="truncate font-semibold text-foreground/80">
                              {contact.actorLifecycleState || "SIN_ESTADO"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-input px-3 py-2">
                            <span className="text-muted-foreground">Stage</span>
                            <span className="truncate font-semibold text-primary">
                              {stageLabel(contact.lastThreadStage)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-input px-3 py-2">
                            <span className="text-muted-foreground">Actividad</span>
                            <span className="truncate font-semibold text-foreground/80">
                              {formatRelativeTs(contact.lastMessageAt)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleOpenInbox(contact)}
                            disabled={!canOpenInbox || preparing}
                            className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-primary/20 bg-[#1B122A] text-sm font-semibold text-foreground/80 transition-colors hover:border-primary/40 hover:bg-[#25112D] disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            <MessageCircle size={15} />
                            {preparing ? "Preparando..." : inboxLabel}
                          </button>
                          <span className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            <ContactRound size={14} />
                            {contact.objectType}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando <span className="font-semibold text-foreground">{items.length}</span> de{" "}
              <span className="font-semibold text-foreground">{total}</span> contactos.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1 || loading}
                className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={!data?.hasNext || loading}
                className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ── Modal nuevo contacto WhatsApp ── */}
      {showCreateWhatsapp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateWhatsapp}
            className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary">Nuevo contacto WhatsApp</h2>
                <p className="mt-1 text-xs text-muted-foreground">Crea una identidad Baileys para mensajería.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateWhatsapp(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-card hover:text-foreground"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <input
                value={whatsappForm.phone}
                onChange={(event) => setWhatsappForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="Teléfono con código país"
                required
                className={fieldInput + " sm:col-span-2"}
              />
              <input
                value={whatsappForm.displayName || ""}
                onChange={(event) => setWhatsappForm((prev) => ({ ...prev, displayName: event.target.value }))}
                placeholder="Nombre"
                className={fieldInput + " sm:col-span-2"}
              />
              <input
                value={whatsappForm.rut || ""}
                onChange={(event) => setWhatsappForm((prev) => ({ ...prev, rut: event.target.value }))}
                placeholder="RUT"
                className={fieldInput}
              />
              <input
                value={whatsappForm.city || ""}
                onChange={(event) => setWhatsappForm((prev) => ({ ...prev, city: event.target.value }))}
                placeholder="Ciudad"
                className={fieldInput}
              />
              <input
                value={whatsappForm.email || ""}
                onChange={(event) => setWhatsappForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="Email"
                className={fieldInput + " sm:col-span-2"}
              />
              <textarea
                value={whatsappForm.notes || ""}
                onChange={(event) => setWhatsappForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Notas"
                className="min-h-24 rounded-md border border-border bg-input px-3 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 sm:col-span-2 focus:border-primary/40 transition"
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateWhatsapp(false)}
                className="h-10 rounded-md border border-border px-4 text-sm font-semibold text-muted-foreground transition hover:bg-card hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={16} />
                Crear contacto
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
