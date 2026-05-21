import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import {
  ACCION_OPTIONS,
  DECISION_OPTIONS,
  MODO_DEFAULT_OPTIONS,
  type CreateStageTemplateInput,
  type StageTemplate,
  type UpdateStageTemplateInput,
} from "@/types/stageTemplates";
import {
  createStageTemplate,
  deleteStageTemplate,
  listStageTemplates,
  updateStageTemplate,
} from "@/services/stageTemplates.service";

const EMPTY_FORM: CreateStageTemplateInput = {
  stage_actual: "",
  posicion: null,
  posibles_match: "",
  es_fallback: false,
  procesa_datos: false,
  dato_esperado: null,
  nuevo_stage: "",
  tipo_respuesta: "",
  activo: true,
  stage_route: null,
  modo_default: null,
  factible: null,
  decision: null,
  accion: null,
};

const inp = "w-full rounded border border-border bg-input px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/50";
const lbl = "block text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground mb-0.5";

function TemplateModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial: CreateStageTemplateInput;
  onSave: (data: CreateStageTemplateInput) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<CreateStageTemplateInput>(initial);

  const field = (key: keyof CreateStageTemplateInput, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <X size={16} />
        </button>
        <h2 className="mb-4 text-sm font-black uppercase tracking-[0.3em] text-primary">
          {initial.stage_actual ? "Editar Template" : "Nuevo Template"}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={lbl}>stage_actual *</label>
            <input className={inp} value={form.stage_actual} onChange={(e) => field("stage_actual", e.target.value)} />
          </div>

          <div>
            <label className={lbl}>nuevo_stage *</label>
            <input className={inp} value={form.nuevo_stage} onChange={(e) => field("nuevo_stage", e.target.value)} />
          </div>

          <div>
            <label className={lbl}>posicion</label>
            <input
              type="number"
              className={inp}
              value={form.posicion ?? ""}
              onChange={(e) => field("posicion", e.target.value ? Number(e.target.value) : null)}
            />
          </div>

          <div>
            <label className={lbl}>decision</label>
            <select className={inp} value={form.decision ?? ""} onChange={(e) => field("decision", e.target.value || null)}>
              <option value="">— ninguna —</option>
              {DECISION_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className={lbl}>accion</label>
            <select className={inp} value={form.accion ?? ""} onChange={(e) => field("accion", e.target.value || null)}>
              <option value="">— ninguna —</option>
              {ACCION_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className={lbl}>modo_default</label>
            <select className={inp} value={form.modo_default ?? ""} onChange={(e) => field("modo_default", e.target.value || null)}>
              <option value="">— ninguno —</option>
              {MODO_DEFAULT_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className={lbl}>stage_route</label>
            <input className={inp} value={form.stage_route ?? ""} onChange={(e) => field("stage_route", e.target.value || null)} />
          </div>

          <div>
            <label className={lbl}>dato_esperado</label>
            <input className={inp} value={form.dato_esperado ?? ""} onChange={(e) => field("dato_esperado", e.target.value || null)} />
          </div>

          <div className="flex items-center gap-4 col-span-2">
            <label className="flex items-center gap-2 text-xs text-foreground/80 cursor-pointer">
              <input type="checkbox" checked={form.es_fallback ?? false} onChange={(e) => field("es_fallback", e.target.checked)} />
              es_fallback
            </label>
            <label className="flex items-center gap-2 text-xs text-foreground/80 cursor-pointer">
              <input type="checkbox" checked={form.procesa_datos ?? false} onChange={(e) => field("procesa_datos", e.target.checked)} />
              procesa_datos
            </label>
            <label className="flex items-center gap-2 text-xs text-foreground/80 cursor-pointer">
              <input type="checkbox" checked={form.activo ?? true} onChange={(e) => field("activo", e.target.checked)} />
              activo
            </label>
            <div className="ml-4 flex items-center gap-2">
              <label className={lbl + " mb-0"}>factible</label>
              <select
                className="rounded border border-border bg-input px-2 py-1 text-xs text-foreground"
                value={form.factible === null ? "" : String(form.factible)}
                onChange={(e) => field("factible", e.target.value === "" ? null : e.target.value === "true")}
              >
                <option value="">— null —</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
          </div>

          <div className="col-span-2">
            <label className={lbl}>posibles_match *</label>
            <textarea
              className={inp + " min-h-[80px]"}
              value={form.posibles_match}
              onChange={(e) => field("posibles_match", e.target.value)}
            />
          </div>

          <div className="col-span-2">
            <label className={lbl}>tipo_respuesta *</label>
            <textarea
              className={inp + " min-h-[60px]"}
              value={form.tipo_respuesta}
              onChange={(e) => field("tipo_respuesta", e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border border-border px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground">
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.stage_actual || !form.nuevo_stage || !form.posibles_match || !form.tipo_respuesta}
            className="flex items-center gap-1.5 rounded bg-primary/10 border border-primary/30 px-4 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 disabled:opacity-40"
          >
            <Save size={13} />
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StageTemplatesPage() {
  const [rows, setRows] = useState<StageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [filterInput, setFilterInput] = useState("");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; row?: StageTemplate } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const filterRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async (stageActual?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listStageTemplates(stageActual || undefined);
      setRows(data);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleFilterChange = (val: string) => {
    setFilterInput(val);
    if (filterRef.current) clearTimeout(filterRef.current);
    filterRef.current = setTimeout(() => {
      setFilter(val);
      void load(val.trim() || undefined);
    }, 400);
  };

  const handleSave = async (data: CreateStageTemplateInput) => {
    setSaving(true);
    setError(null);
    try {
      if (modal?.mode === "edit" && modal.row) {
        const updated = await updateStageTemplate(modal.row.id, data as UpdateStageTemplateInput);
        setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await createStageTemplate(data);
        setRows((prev) => [...prev, created]);
      }
      setModal(null);
    } catch (e: any) {
      setError(e?.message ?? "Error guardando");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este template?")) return;
    setDeleting(id);
    try {
      await deleteStageTemplate(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      setError(e?.message ?? "Error eliminando");
    } finally {
      setDeleting(null);
    }
  };

  const toEditForm = (row: StageTemplate): CreateStageTemplateInput => ({
    stage_actual: row.stage_actual,
    posicion: row.posicion,
    posibles_match: row.posibles_match,
    es_fallback: row.es_fallback,
    procesa_datos: row.procesa_datos,
    dato_esperado: row.dato_esperado,
    nuevo_stage: row.nuevo_stage,
    tipo_respuesta: row.tipo_respuesta,
    activo: row.activo,
    stage_route: row.stage_route,
    modo_default: row.modo_default,
    factible: row.factible,
    decision: row.decision,
    accion: row.accion,
  });

  const badge = (val: string | null | boolean | undefined) => {
    if (val === null || val === undefined || val === "") return <span className="text-muted-foreground/50">—</span>;
    const colors: Record<string, string> = {
      enviar: "text-emerald-400 bg-emerald-400/10",
      delegar: "text-amber-400 bg-amber-400/10",
      negociar: "text-sky-400 bg-sky-400/10",
      rechazar: "text-rose-400 bg-rose-400/10",
      avanzar: "text-violet-400 bg-violet-400/10",
      offer: "text-sky-400 bg-sky-400/10",
      scraper: "text-orange-400 bg-orange-400/10",
      handoff: "text-pink-400 bg-pink-400/10",
      reiniciar: "text-yellow-400 bg-yellow-400/10",
    };
    const str = String(val);
    const cls = colors[str] ?? "text-muted-foreground bg-muted";
    return <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${cls}`}>{str}</span>;
  };

  return (
    <div className="flex h-full flex-col bg-background text-foreground gap-6 p-6">
      <header className="rounded-xl border border-border bg-card p-6 flex items-end justify-between gap-4">
        <div>
          <p className="page-label">Stages</p>
          <h1 className="page-title mt-3">Stage Templates</h1>
          <p className="page-subtitle mt-2">{rows.length} registros · solo superadmin</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={filterInput}
            onChange={(e) => handleFilterChange(e.target.value)}
            placeholder="Filtrar por stage_actual..."
            className="rounded-xl border border-border bg-input px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 w-56"
          />
          <button
            onClick={() => setModal({ mode: "create" })}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs font-bold text-primary hover:bg-primary/20 transition"
          >
            <Plus size={14} /> Nuevo
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-300">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto rounded-xl border border-border bg-card px-6 py-4">
        {loading ? (
          <p className="text-xs text-muted-foreground">Cargando...</p>
        ) : (
          <div className="overflow-auto max-h-full">
            <table className="min-w-max text-left text-xs">
              <thead>
                <tr className="sticky top-0 z-10 bg-background border-b border-border text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  <th className="pb-2 pr-3 w-10">ID</th>
                  <th className="pb-2 pr-3">stage_actual</th>
                  <th className="pb-2 pr-3 w-8">pos</th>
                  <th className="pb-2 pr-3">nuevo_stage</th>
                  <th className="pb-2 pr-3">decision</th>
                  <th className="pb-2 pr-3">accion</th>
                  <th className="pb-2 pr-3">modo</th>
                  <th className="pb-2 pr-3">stage_route</th>
                  <th className="pb-2 pr-3">dato_esperado</th>
                  <th className="pb-2 pr-3">factible</th>
                  <th className="pb-2 pr-3">activo</th>
                  <th className="pb-2 pr-3">fallback</th>
                  <th className="pb-2 pr-3">proc_datos</th>
                  <th className="pb-2 pr-3">posibles_match</th>
                  <th className="pb-2 pr-3">tipo_respuesta</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border hover:bg-card transition-colors">
                    <td className="py-2 pr-4 text-muted-foreground/50 whitespace-nowrap">{row.id}</td>
                    <td className="py-2 pr-4 text-[11px] text-foreground/80 whitespace-nowrap">{row.stage_actual}</td>
                    <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">{row.posicion ?? "—"}</td>
                    <td className="py-2 pr-4 text-[11px] text-muted-foreground whitespace-nowrap">{row.nuevo_stage}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{badge(row.decision)}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{badge(row.accion)}</td>
                    <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">{row.modo_default ?? "—"}</td>
                    <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">{row.stage_route ?? "—"}</td>
                    <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">{row.dato_esperado ?? "—"}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {row.factible === null ? <span className="text-muted-foreground/50">—</span>
                        : <span className={row.factible ? "text-emerald-400" : "text-rose-400"}>{String(row.factible)}</span>}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span className={row.activo ? "text-emerald-400" : "text-muted-foreground/50"}>{row.activo ? "sí" : "no"}</span>
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span className={row.es_fallback ? "text-amber-400" : "text-muted-foreground/50"}>{row.es_fallback ? "sí" : "no"}</span>
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span className={row.procesa_datos ? "text-sky-400" : "text-muted-foreground/50"}>{row.procesa_datos ? "sí" : "no"}</span>
                    </td>
                    <td className="py-2 pr-4 text-[11px] text-muted-foreground max-w-[220px] truncate" title={row.posibles_match}>{row.posibles_match}</td>
                    <td className="py-2 pr-4 text-[11px] text-muted-foreground max-w-[220px] truncate" title={row.tipo_respuesta}>{row.tipo_respuesta}</td>
                    <td className="py-2 flex items-center gap-2">
                      <button
                        onClick={() => setModal({ mode: "edit", row })}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => void handleDelete(row.id)}
                        disabled={deleting === row.id}
                        className="text-muted-foreground hover:text-rose-400 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={16} className="py-8 text-center text-muted-foreground/50">
                      {filter ? `Sin resultados para "${filter}"` : "Sin registros"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <TemplateModal
          initial={modal.mode === "edit" && modal.row ? toEditForm(modal.row) : { ...EMPTY_FORM }}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
