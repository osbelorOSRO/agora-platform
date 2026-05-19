import { useEffect, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { TIPO_OPTIONS, type CreateOfferInput, type Offer, type UpdateOfferInput } from "@/types/offers";
import { createOffer, deleteOffer, listOffers, updateOffer } from "@/services/offers.service";

const EMPTY_FORM: CreateOfferInput = {
  codigo: "",
  nombre: null,
  precio_base: null,
  tipo: null,
  descripcion: null,
  lineas: null,
  excluye_alta: false,
  excluye_portabilidad_postpago: false,
  url_archivo: null,
  precio_normal: null,
  duracion_precio: null,
  gigas: null,
  minutos: null,
  tiene_redes_libres: false,
  roaming: null,
};

function OfferModal({
  initial,
  isEdit,
  onSave,
  onClose,
  saving,
}: {
  initial: CreateOfferInput;
  isEdit: boolean;
  onSave: (data: CreateOfferInput) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<CreateOfferInput>(initial);
  const f = (key: keyof CreateOfferInput, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const inp = "w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-[#6dfe9c]/50";
  const lbl = "block text-[10px] uppercase tracking-wide text-slate-500 mb-0.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-white/10 bg-[#0a1f27] p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-500 hover:text-white">
          <X size={16} />
        </button>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#6dfe9c]">
          {isEdit ? "Editar Oferta" : "Nueva Oferta"}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>codigo *</label>
            <input className={inp} value={form.codigo} onChange={(e) => f("codigo", e.target.value)} disabled={isEdit} />
          </div>

          <div>
            <label className={lbl}>tipo</label>
            <select className={inp} value={form.tipo ?? ""} onChange={(e) => f("tipo", e.target.value || null)}>
              <option value="">— ninguno —</option>
              {TIPO_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div className="col-span-2">
            <label className={lbl}>nombre</label>
            <input className={inp} value={form.nombre ?? ""} onChange={(e) => f("nombre", e.target.value || null)} />
          </div>

          <div>
            <label className={lbl}>precio_base</label>
            <input type="number" className={inp} value={form.precio_base ?? ""} onChange={(e) => f("precio_base", e.target.value ? Number(e.target.value) : null)} />
          </div>

          <div>
            <label className={lbl}>precio_normal</label>
            <input type="number" className={inp} value={form.precio_normal ?? ""} onChange={(e) => f("precio_normal", e.target.value ? Number(e.target.value) : null)} />
          </div>

          <div>
            <label className={lbl}>duracion_precio</label>
            <input className={inp} value={form.duracion_precio ?? ""} onChange={(e) => f("duracion_precio", e.target.value || null)} />
          </div>

          <div>
            <label className={lbl}>lineas</label>
            <input type="number" className={inp} value={form.lineas ?? ""} onChange={(e) => f("lineas", e.target.value ? Number(e.target.value) : null)} />
          </div>

          <div>
            <label className={lbl}>gigas</label>
            <input type="number" className={inp} value={form.gigas ?? ""} onChange={(e) => f("gigas", e.target.value ? Number(e.target.value) : null)} />
          </div>

          <div>
            <label className={lbl}>minutos</label>
            <input className={inp} value={form.minutos ?? ""} onChange={(e) => f("minutos", e.target.value || null)} />
          </div>

          <div>
            <label className={lbl}>roaming</label>
            <input className={inp} value={form.roaming ?? ""} onChange={(e) => f("roaming", e.target.value || null)} />
          </div>

          <div className="col-span-2">
            <label className={lbl}>url_archivo</label>
            <input className={inp} value={form.url_archivo ?? ""} onChange={(e) => f("url_archivo", e.target.value || null)} />
          </div>

          <div className="col-span-2 flex items-center gap-6">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.excluye_alta ?? false} onChange={(e) => f("excluye_alta", e.target.checked)} />
              excluye_alta
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.excluye_portabilidad_postpago ?? false} onChange={(e) => f("excluye_portabilidad_postpago", e.target.checked)} />
              excluye_portabilidad_postpago
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input type="checkbox" checked={form.tiene_redes_libres ?? false} onChange={(e) => f("tiene_redes_libres", e.target.checked)} />
              tiene_redes_libres
            </label>
          </div>

          <div className="col-span-2">
            <label className={lbl}>descripcion</label>
            <textarea className={inp + " min-h-[80px]"} value={form.descripcion ?? ""} onChange={(e) => f("descripcion", e.target.value || null)} />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border border-white/10 px-4 py-1.5 text-xs text-slate-400 hover:text-white">
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.codigo}
            className="flex items-center gap-1.5 rounded bg-[#6dfe9c]/10 border border-[#6dfe9c]/30 px-4 py-1.5 text-xs font-bold text-[#6dfe9c] hover:bg-[#6dfe9c]/20 disabled:opacity-40"
          >
            <Save size={13} />
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OffersPage() {
  const [rows, setRows] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ isEdit: boolean; row?: Offer } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; nombre: string | null } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listOffers());
    } catch (e: any) {
      setError(e?.message ?? "Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleSave = async (data: CreateOfferInput) => {
    setSaving(true);
    setError(null);
    try {
      if (modal?.isEdit && modal.row) {
        const { codigo, ...rest } = data;
        const updated = await updateOffer(modal.row.codigo, rest as UpdateOfferInput);
        setRows((prev) => prev.map((r) => (r.codigo === updated.codigo ? updated : r)));
      } else {
        const created = await createOffer(data);
        setRows((prev) => [...prev, created].sort((a, b) => a.codigo.localeCompare(b.codigo)));
      }
      setModal(null);
    } catch (e: any) {
      setError(e?.message ?? "Error guardando");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (codigo: string) => {
    if (!confirm(`¿Eliminar oferta "${codigo}"?`)) return;
    setDeleting(codigo);
    try {
      await deleteOffer(codigo);
      setRows((prev) => prev.filter((r) => r.codigo !== codigo));
    } catch (e: any) {
      setError(e?.message ?? "Error eliminando");
    } finally {
      setDeleting(null);
    }
  };

  const toEditForm = (row: Offer): CreateOfferInput => ({
    codigo: row.codigo,
    nombre: row.nombre,
    precio_base: row.precio_base ? Number(row.precio_base) : null,
    tipo: row.tipo,
    descripcion: row.descripcion,
    lineas: row.lineas,
    excluye_alta: row.excluye_alta ?? false,
    excluye_portabilidad_postpago: row.excluye_portabilidad_postpago ?? false,
    url_archivo: row.url_archivo,
    precio_normal: row.precio_normal,
    duracion_precio: row.duracion_precio,
    gigas: row.gigas,
    minutos: row.minutos,
    tiene_redes_libres: row.tiene_redes_libres ?? false,
    roaming: row.roaming,
  });

  const tipoBadge = (tipo: string | null) => {
    if (!tipo) return <span className="text-slate-600">—</span>;
    const colors: Record<string, string> = {
      individual: "text-sky-400 bg-sky-400/10",
      multilineas: "text-violet-400 bg-violet-400/10",
      adicional: "text-amber-400 bg-amber-400/10",
    };
    return <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${colors[tipo] ?? "text-slate-400 bg-slate-400/10"}`}>{tipo}</span>;
  };

  const bool = (val: boolean | null, colorTrue = "text-emerald-400") =>
    val === null ? <span className="text-slate-600">—</span>
      : <span className={val ? colorTrue : "text-slate-600"}>{val ? "sí" : "no"}</span>;

  return (
    <div className="flex h-full flex-col bg-[#031015] text-slate-200">
      <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
        <div>
          <h1 className="text-sm font-black uppercase tracking-widest text-[#6dfe9c]">Offers</h1>
          <p className="text-[10px] text-slate-500">{rows.length} registros · solo superadmin</p>
        </div>
        <button
          onClick={() => setModal({ isEdit: false })}
          className="flex items-center gap-1.5 rounded border border-[#6dfe9c]/30 bg-[#6dfe9c]/10 px-3 py-1.5 text-xs font-bold text-[#6dfe9c] hover:bg-[#6dfe9c]/20"
        >
          <Plus size={13} /> Nueva
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-3 rounded border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-300">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <p className="text-xs text-slate-500">Cargando...</p>
        ) : (
          <div className="overflow-auto max-h-full">
            <table className="min-w-max text-left text-xs">
              <thead>
                <tr className="sticky top-0 z-10 bg-[#031015] border-b border-white/5 text-[10px] uppercase tracking-widest text-slate-500">
                  <th className="pb-2 pr-4">codigo</th>
                  <th className="pb-2 pr-4">nombre</th>
                  <th className="pb-2 pr-4">tipo</th>
                  <th className="pb-2 pr-4">precio_base</th>
                  <th className="pb-2 pr-4">precio_normal</th>
                  <th className="pb-2 pr-4">duracion</th>
                  <th className="pb-2 pr-4">lineas</th>
                  <th className="pb-2 pr-4">gigas</th>
                  <th className="pb-2 pr-4">minutos</th>
                  <th className="pb-2 pr-4">redes libres</th>
                  <th className="pb-2 pr-4">excl. alta</th>
                  <th className="pb-2 pr-4">excl. porta</th>
                  <th className="pb-2 pr-4">roaming</th>
                  <th className="pb-2 pr-4">imagen</th>
                  <th className="pb-2 pr-4">url_archivo</th>
                  <th className="pb-2 pr-4">descripcion</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.codigo} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="py-2 pr-4 font-mono text-slate-300 whitespace-nowrap">{row.codigo}</td>
                    <td className="py-2 pr-4 text-slate-200 whitespace-nowrap">{row.nombre ?? "—"}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{tipoBadge(row.tipo)}</td>
                    <td className="py-2 pr-4 text-slate-300 whitespace-nowrap">{row.precio_base ? `$${Number(row.precio_base).toLocaleString("es-CL")}` : "—"}</td>
                    <td className="py-2 pr-4 text-slate-400 whitespace-nowrap">{row.precio_normal ? `$${row.precio_normal.toLocaleString("es-CL")}` : "—"}</td>
                    <td className="py-2 pr-4 text-slate-500 whitespace-nowrap">{row.duracion_precio ?? "—"}</td>
                    <td className="py-2 pr-4 text-slate-400 whitespace-nowrap">{row.lineas ?? "—"}</td>
                    <td className="py-2 pr-4 text-slate-400 whitespace-nowrap">{row.gigas ?? "—"}</td>
                    <td className="py-2 pr-4 text-slate-400 whitespace-nowrap">{row.minutos ?? "—"}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{bool(row.tiene_redes_libres)}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{bool(row.excluye_alta, "text-rose-400")}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{bool(row.excluye_portabilidad_postpago, "text-rose-400")}</td>
                    <td className="py-2 pr-4 text-slate-500 whitespace-nowrap">{row.roaming ?? "—"}</td>
                    <td className="py-2 pr-4">
                      {row.url_archivo
                        ? <img
                            src={row.url_archivo}
                            alt={row.codigo}
                            className="h-10 w-10 rounded object-cover border border-white/10 cursor-zoom-in"
                            onDoubleClick={() => setLightbox({ url: row.url_archivo!, nombre: row.nombre })}
                          />
                        : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="py-2 pr-4 text-[11px] text-slate-500 max-w-[180px] truncate" title={row.url_archivo ?? ""}>{row.url_archivo ?? "—"}</td>
                    <td className="py-2 pr-4 text-[11px] text-slate-500 max-w-[220px] truncate" title={row.descripcion ?? ""}>{row.descripcion ?? "—"}</td>
                    <td className="py-2 flex items-center gap-2">
                      <button onClick={() => setModal({ isEdit: true, row })} className="text-slate-500 hover:text-[#6dfe9c] transition-colors" title="Editar">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => void handleDelete(row.codigo)} disabled={deleting === row.codigo} className="text-slate-500 hover:text-rose-400 transition-colors" title="Eliminar">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={16} className="py-8 text-center text-slate-600">Sin registros</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-lg w-full mx-4 rounded-xl border border-white/10 bg-[#0a1f27] p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute right-3 top-3 rounded-full bg-black/40 p-1 text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
            {lightbox.nombre && (
              <p className="mb-3 text-xs font-semibold text-slate-300">{lightbox.nombre}</p>
            )}
            <img
              src={lightbox.url}
              alt={lightbox.nombre ?? ""}
              className="w-full rounded-lg object-contain max-h-[70vh]"
            />
          </div>
        </div>
      )}

      {modal && (
        <OfferModal
          initial={modal.isEdit && modal.row ? toEditForm(modal.row) : { ...EMPTY_FORM }}
          isEdit={modal.isEdit}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
