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

  useEffect(() => {
    setPage(1);
  }, [provider]);

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

    return () => {
      cancelled = true;
    };
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
        <section className="border border-white/10 bg-black/20 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#7ce6ff]">
                Agenda
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
                Contactos conversacionales
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                Directorio de actores/contactos basado en Meta Inbox y Baileys. La agenda permite encontrar,
                clasificar y preparar contactos sin borrar registros.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="border border-white/10 bg-white/5 px-5 py-4">
                <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Contactos</p>
                <p className="mt-2 text-3xl font-black text-white">{total}</p>
              </div>
              <div className="border border-white/10 bg-white/5 px-5 py-4">
                <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Canal</p>
                <p className="mt-2 truncate text-sm font-semibold text-white">{providerLabel(provider)}</p>
              </div>
              <div className="border border-white/10 bg-white/5 px-5 py-4">
                <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Busqueda</p>
                <p className="mt-2 truncate text-sm font-semibold text-white">{search || "Sin filtro"}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border border-white/10 bg-[#06161b]/90 p-6 shadow-xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid w-full gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Buscar nombre, telefono, rut, email o actor id..."
                  className="h-11 w-full rounded-md border border-white/10 bg-[#102127] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#6dfe9c]/40"
                />
              </div>
              <select
                value={provider}
                onChange={(event) => setProvider(event.target.value as (typeof PROVIDERS)[number])}
                className="h-11 rounded-md border border-white/10 bg-[#102127] px-3 text-sm text-white outline-none transition focus:border-[#6dfe9c]/40"
              >
                {PROVIDERS.map((item) => (
                  <option key={item} value={item}>
                    {providerLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateWhatsapp(true)}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-[#6dfe9c]/20 bg-[#11313a] px-4 text-sm font-semibold text-[#bfffd6] transition hover:border-[#6dfe9c]/40 hover:bg-[#163b45]"
            >
              <Plus size={16} />
              WhatsApp
            </button>
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="border border-dashed border-white/10 bg-black/10 px-6 py-12 text-center text-sm text-slate-400">
                Cargando agenda...
              </div>
            ) : error ? (
              <div className="border border-red-500/20 bg-red-500/10 px-6 py-12 text-center text-sm text-red-200">
                {error}
              </div>
            ) : items.length === 0 ? (
              <div className="border border-dashed border-white/10 bg-black/10 px-6 py-12 text-center text-sm text-slate-400">
                No encontramos contactos con ese criterio.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
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
                      className="border border-white/10 bg-[#0b1c22] p-5 shadow-lg transition hover:border-[#7ce6ff]/20 hover:bg-[#0f2229]"
                    >
                      <div className="flex items-start gap-4">
                        <span
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border ${providerClass(contact.objectType)}`}
                          title={providerLabel(contact.objectType)}
                        >
                          <ContactProviderIcon objectType={contact.objectType} className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-bold text-white">{title || "Sin nombre"}</p>
                          <p className="mt-1 truncate text-sm text-slate-400">{compactActorId(contact)}</p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm">
                        <div className="flex items-center justify-between gap-3 rounded-md border border-white/5 bg-white/5 px-3 py-2">
                          <span className="text-slate-400">Lifecycle</span>
                          <span className="truncate font-semibold text-slate-200">
                            {contact.actorLifecycleState || "SIN_ESTADO"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-md border border-white/5 bg-white/5 px-3 py-2">
                          <span className="text-slate-400">Stage</span>
                          <span className="truncate font-semibold text-[#bfffd6]">
                            {stageLabel(contact.lastThreadStage)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-md border border-white/5 bg-white/5 px-3 py-2">
                          <span className="text-slate-400">Actividad</span>
                          <span className="truncate font-semibold text-slate-200">
                            {formatRelativeTs(contact.lastMessageAt)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleOpenInbox(contact)}
                          disabled={!canOpenInbox || preparing}
                          className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-[#7ce6ff]/20 bg-[#102831] text-sm font-semibold text-[#bdefff] transition hover:border-[#7ce6ff]/40 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <MessageCircle size={15} />
                          {preparing ? "Preparando..." : inboxLabel}
                        </button>
                        <span className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                          <ContactRound size={14} />
                          {contact.objectType}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Mostrando <span className="font-semibold text-slate-200">{items.length}</span> de{" "}
              <span className="font-semibold text-slate-200">{total}</span> contactos.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1 || loading}
                className="rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-sm text-slate-400">
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={!data?.hasNext || loading}
                className="rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>
      </div>

      {showCreateWhatsapp ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateWhatsapp}
            className="w-full max-w-lg border border-white/10 bg-[#07191f] p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Nuevo contacto WhatsApp</h2>
                <p className="mt-1 text-sm text-slate-400">Crea una identidad Baileys para mensajeria.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateWhatsapp(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-300 transition hover:bg-white/5"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <input
                value={whatsappForm.phone}
                onChange={(event) => setWhatsappForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="Telefono con codigo pais"
                required
                className="h-11 rounded-md border border-white/10 bg-[#102127] px-3 text-sm text-white outline-none placeholder:text-slate-500 sm:col-span-2"
              />
              <input
                value={whatsappForm.displayName || ""}
                onChange={(event) => setWhatsappForm((prev) => ({ ...prev, displayName: event.target.value }))}
                placeholder="Nombre"
                className="h-11 rounded-md border border-white/10 bg-[#102127] px-3 text-sm text-white outline-none placeholder:text-slate-500 sm:col-span-2"
              />
              <input
                value={whatsappForm.rut || ""}
                onChange={(event) => setWhatsappForm((prev) => ({ ...prev, rut: event.target.value }))}
                placeholder="RUT"
                className="h-11 rounded-md border border-white/10 bg-[#102127] px-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <input
                value={whatsappForm.city || ""}
                onChange={(event) => setWhatsappForm((prev) => ({ ...prev, city: event.target.value }))}
                placeholder="Ciudad"
                className="h-11 rounded-md border border-white/10 bg-[#102127] px-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <input
                value={whatsappForm.email || ""}
                onChange={(event) => setWhatsappForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="Email"
                className="h-11 rounded-md border border-white/10 bg-[#102127] px-3 text-sm text-white outline-none placeholder:text-slate-500 sm:col-span-2"
              />
              <textarea
                value={whatsappForm.notes || ""}
                onChange={(event) => setWhatsappForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Notas"
                className="min-h-24 rounded-md border border-white/10 bg-[#102127] px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 sm:col-span-2"
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateWhatsapp(false)}
                className="h-10 rounded-md border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#08e36f] px-4 text-sm font-bold text-[#04130a] transition hover:bg-[#35f58c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={16} />
                Crear contacto
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
