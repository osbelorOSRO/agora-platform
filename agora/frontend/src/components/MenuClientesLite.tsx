import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { estilos } from "@/theme/estilos";
import { getClientesLite } from "@/services/clientesLite.service";
import type { ClienteLite } from "@/types/cliente";

const API_URL = import.meta.env.VITE_API_URL;

type Props = {
  abierto: boolean;
  onClose: () => void;
  onPick: (c: ClienteLite) => void;
};

const LIMIT = 20;

export default function MenuClientesLite({ abierto, onClose, onPick }: Props) {
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ClienteLite[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const debounced = useMemo(() => {
    let t: number | undefined;
    return (v: string, cb: (val: string) => void) => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => cb(v), 250);
    };
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const id = setTimeout(() => inputRef.current?.focus(), 50);
    setInputValue("");
    setSearchQuery("");
    setPage(1);
    setItems([]);
    setHasNext(false);
    setTotal(0);
    setErr(null);
    return () => clearTimeout(id);
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const r = await getClientesLite({ search: searchQuery, page, limit: LIMIT });
        if (cancel) return;
        setHasNext(r.hasNext);
        setTotal(r.total ?? 0);
        setItems((prev) => (page === 1 ? r.items : [...prev, ...r.items]));
      } catch (e: any) {
        if (!cancel) setErr(e?.message ?? "Error cargando clientes");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [abierto, searchQuery, page]);

  function onChangeSearch(v: string) {
    setInputValue(v);
    
    debounced(v, (val) => {
      setSearchQuery(val);
      setPage(1);
      setItems([]);
      setHasNext(false);
      scrollRef.current?.scrollTo({ top: 0 });
    });
  }

  function limpiarBusqueda() {
    setInputValue("");
    setSearchQuery("");
    setPage(1);
    setItems([]);
    setHasNext(false);
    setTimeout(() => inputRef.current?.focus(), 0);
    scrollRef.current?.scrollTo({ top: 0 });
  }

  function onKeyDownSearch(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const value = (e.target as HTMLInputElement).value;
      setSearchQuery(value);
      setPage(1);
      setItems([]);
      setHasNext(false);
      scrollRef.current?.scrollTo({ top: 0 });
    }
    if (e.key === "Escape") onClose();
  }

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    if (!hasNext || loading) return;
    const el = e.currentTarget;
    const ratio = (el.scrollTop + el.clientHeight) / el.scrollHeight;
    if (ratio > 0.85) setPage((p) => p + 1);
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const uniqueItems = Array.from(
    new Map(items.map((item) => [item.cliente_id, item])).values()
  );

  return (
    <AnimatePresence>
      {abierto && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className={estilos.menuClientesLite.contenedor}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.22 }}
            role="dialog"
            aria-modal="true"
            aria-label="Seleccionar cliente"
          >
            <div className={estilos.menuClientesLite.header}>
              <h3 className={estilos.menuClientesLite.titulo}>Iniciar conversación</h3>
              <button onClick={onClose} className={estilos.menuClientesLite.botonCerrar} aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Buscar por nombre o cliente ID…"
                  className={`${estilos.input} ${estilos.menuClientesLite.inputBusqueda}`}
                  value={inputValue}
                  onChange={(e) => onChangeSearch(e.target.value)}
                  onKeyDown={onKeyDownSearch}
                  aria-label="Buscar cliente"
                />
                {inputValue && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100"
                    onClick={limpiarBusqueda}
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="mt-2 text-xs opacity-70">{total > 0 ? `Resultados: ${total}` : "Resultados: 0"}</div>
            </div>
            <div ref={scrollRef} onScroll={onScroll} className={estilos.menuClientesLite.listaScrollable}>
              {err ? (
                <div className="py-8 text-center text-sm text-red-600">{err}</div>
              ) : (
                <ul className="divide-y">
                  {uniqueItems.length === 0 && !loading && <li className="py-8 text-center text-sm opacity-70">Sin resultados</li>}
                  {uniqueItems.map((c) => (
                    <li key={c.cliente_id}>
                      <button
                        className="w-full flex items-center gap-3 p-3 hover:bg-black/5 focus:bg-black/5 focus:outline-none"
                        onClick={() => onPick(c)}
                        title={`Abrir chat con ${c.nombre ?? c.cliente_id}`}
                      >
                        <img
                          src={`${API_URL}/uploads/avatares/foto_perfil_hombre_default_02.png`}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-600/40"
                          alt=""
                        />
                        <div className="flex-1 text-left min-w-0">
                          <div className={estilos.menuClientesLite.itemNombre}>{c.nombre?.trim() || c.cliente_id}</div>
                          <div className={estilos.menuClientesLite.itemId}>{c.cliente_id}</div>
                        </div>
                      </button>
                    </li>
                  ))}
                  {loading && <li className="py-4 text-center text-sm opacity-70">Cargando…</li>}
                </ul>
              )}
            </div>
            <div className={estilos.menuClientesLite.footer}>
              <div className={estilos.menuClientesLite.textoFooter}>
                Página {Math.min(page, totalPages)} de {totalPages}
              </div>
              <div className="flex items-center gap-1">
                <button
                  className={estilos.iconButton}
                  disabled={page <= 1 || loading}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    setItems([]);
                    scrollRef.current?.scrollTo({ top: 0 });
                  }}
                  title="Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  className={estilos.iconButton}
                  disabled={!hasNext || loading}
                  onClick={() => {
                    setPage((p) => p + 1);
                  }}
                  title="Siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  className={`${estilos.buttonGhost} flex items-center gap-1 px-3 py-1`}
                  disabled={!hasNext || loading}
                  onClick={() => setPage((p) => p + 1)}
                  title="Cargar más"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Cargar más</span>
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
