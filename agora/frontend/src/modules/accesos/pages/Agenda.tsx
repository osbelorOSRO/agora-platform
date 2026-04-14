import { useEffect, useMemo, useState } from "react";
import { ContactRound, Plus, Search, Trash2 } from "lucide-react";
import FormNuevoCliente from "@/components/FormNuevoCliente";
import FormEliminarCliente from "@/components/FormEliminarCliente";
import { getClientesLite, type ClientesLiteListResponse } from "@/services/clientesLite.service";
import type { ClienteLite } from "@/types/Cliente";

const PAGE_SIZE = 24;

function getAvatar(cliente: ClienteLite) {
  if (cliente.foto_perfil) return cliente.foto_perfil;
  return `${import.meta.env.VITE_API_URL}/uploads/avatares/foto_perfil_hombre_default_02.png`;
}

export default function Agenda() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ClientesLiteListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCrear, setShowCrear] = useState(false);
  const [showEliminar, setShowEliminar] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getClientesLite({ search, page, limit: PAGE_SIZE });
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
  }, [search, page, refreshKey]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#7ce6ff]">
                Agenda de contactos
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
                Gestion centralizada de clientes
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                Lista liviana de contactos para crear, revisar y eliminar registros sin entrar al flujo
                operativo de chats.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
                <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Contactos</p>
                <p className="mt-2 text-3xl font-black text-white">{total}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
                <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Busqueda</p>
                <p className="mt-2 truncate text-sm font-semibold text-white">{search || "Sin filtro"}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
                <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Pagina</p>
                <p className="mt-2 text-3xl font-black text-white">{page}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#06161b]/90 p-6 shadow-xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar por nombre o numero..."
                className="h-12 w-full rounded-2xl border border-white/10 bg-[#102127] pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#6dfe9c]/40"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowCrear(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#6dfe9c]/20 bg-[#11313a] px-4 py-3 text-sm font-semibold text-[#bfffd6] transition hover:border-[#6dfe9c]/40 hover:bg-[#163b45]"
              >
                <Plus size={16} />
                Crear contacto
              </button>
              <button
                type="button"
                onClick={() => setShowEliminar(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              >
                <Trash2 size={16} />
                Eliminar contacto
              </button>
            </div>
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-black/10 px-6 py-12 text-center text-sm text-slate-400">
                Cargando agenda...
              </div>
            ) : error ? (
              <div className="rounded-3xl border border-red-500/20 bg-red-500/10 px-6 py-12 text-center text-sm text-red-200">
                {error}
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-black/10 px-6 py-12 text-center text-sm text-slate-400">
                No encontramos contactos con ese criterio.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {items.map((cliente) => (
                  <article
                    key={cliente.cliente_id}
                    className="rounded-[24px] border border-white/10 bg-[#0b1c22] p-5 shadow-lg transition hover:border-[#7ce6ff]/20 hover:bg-[#0f2229]"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={getAvatar(cliente)}
                        alt={cliente.nombre || cliente.cliente_id}
                        className="h-14 w-14 rounded-full border border-[#6dfe9c]/20 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-white">
                          {cliente.nombre?.trim() || "Sin nombre"}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">{cliente.cliente_id}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                      <div className="flex items-center gap-2 text-slate-300">
                        <ContactRound size={16} className="text-[#7ce6ff]" />
                        <span className="text-sm">Cliente lite</span>
                      </div>
                      <span className="rounded-full bg-[#16323a] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#bfffd6]">
                        activo
                      </span>
                    </div>
                  </article>
                ))}
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
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
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
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        </section>
      </div>

      {showCrear ? (
        <FormNuevoCliente
          onClose={() => setShowCrear(false)}
          onClienteCreado={() => {
            setShowCrear(false);
            handleRefresh();
          }}
        />
      ) : null}

      {showEliminar ? (
        <FormEliminarCliente
          onClose={() => setShowEliminar(false)}
          onClienteEliminado={() => {
            setShowEliminar(false);
            handleRefresh();
          }}
        />
      ) : null}
    </>
  );
}
