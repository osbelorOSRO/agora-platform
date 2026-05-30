import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from "lucide-react";
import { getAuthHeaders } from "@/utils/getAuthHeaders";
import { unwrapEnvelope } from "@/lib/apiClient";
import { env } from "@/lib/env";
import { s } from "@/modules/metaInbox/styles";

type CatalogOption = {
  id: string;
  category: string;
  value: string;
  label: string;
  sortOrder: number;
  active: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  customer_type:     "Tipo de cliente",
  purchase_intent:   "Intención de contratación",
  sale_type:         "Modalidad de venta",
  loss_reason:       "Motivos de pérdida",
  verbalization_tag: "Tags de verbalización",
};

const API = `${env.apiUrl}/meta-inbox/lead-catalog`;
const headers = () => ({ ...getAuthHeaders(), "Content-Type": "application/json" });

async function fetchAll(): Promise<CatalogOption[]> {
  const res = await fetch(API, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error("Error cargando catálogo");
  return unwrapEnvelope(await res.json()) ?? [];
}

async function createOption(body: { category: string; value: string; label: string; sortOrder: number }): Promise<CatalogOption> {
  const res = await fetch(API, { method: "POST", headers: headers(), body: JSON.stringify(body) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Error creando opción");
  }
  return unwrapEnvelope(await res.json());
}

async function toggleActive(id: string, active: boolean): Promise<CatalogOption> {
  const res = await fetch(`${API}/${id}`, { method: "PATCH", headers: headers(), body: JSON.stringify({ active }) });
  if (!res.ok) throw new Error("Error actualizando opción");
  return unwrapEnvelope(await res.json());
}

export default function LeadCatalogPage() {
  const qc = useQueryClient();
  const { data: options = [], isLoading } = useQuery({ queryKey: ["leadCatalog", "all"], queryFn: fetchAll });

  const grouped = options.reduce<Record<string, CatalogOption[]>>((acc, o) => {
    (acc[o.category] ??= []).push(o);
    return acc;
  }, {});

  const { mutate: toggle } = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => toggleActive(id, active),
    onSuccess: (updated) => {
      qc.setQueryData(["leadCatalog", "all"], (old: CatalogOption[] = []) =>
        old.map((o) => (o.id === updated.id ? updated : o)),
      );
      qc.invalidateQueries({ queryKey: ["leadCatalog"] });
    },
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Cargando catálogo…</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">Catálogo de listas de ventas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestiona las opciones de cada lista del formulario de análisis de venta. Puedes agregar nuevas opciones o desactivar las existentes sin eliminarlas.
        </p>
      </div>

      {Object.entries(CATEGORY_LABELS).map(([category, title]) => (
        <CategorySection
          key={category}
          category={category}
          title={title}
          options={(grouped[category] ?? []).sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))}
          onToggle={(id, active) => toggle({ id, active })}
          onCreated={(opt) => {
            qc.setQueryData(["leadCatalog", "all"], (old: CatalogOption[] = []) => [...old, opt]);
            qc.invalidateQueries({ queryKey: ["leadCatalog"] });
          }}
        />
      ))}
    </div>
  );
}

function CategorySection({
  category,
  title,
  options,
  onToggle,
  onCreated,
}: {
  category: string;
  title: string;
  options: CatalogOption[];
  onToggle: (id: string, active: boolean) => void;
  onCreated: (opt: CatalogOption) => void;
}) {
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const label = newLabel.trim();
    const value = newValue.trim() || label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (!label) return;
    setSaving(true);
    setError(null);
    try {
      const maxOrder = options.reduce((m, o) => Math.max(m, o.sortOrder), 0);
      const opt = await createOption({ category, value, label, sortOrder: maxOrder + 1 });
      onCreated(opt);
      setNewLabel("");
      setNewValue("");
      setAdding(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-bold text-foreground">{title}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {options.length} opciones
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-1">
          {options.map((opt) => (
            <div key={opt.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-input">
              <div>
                <span className={`text-sm ${opt.active ? "text-foreground" : "text-muted-foreground line-through"}`}>
                  {opt.label}
                </span>
                <span className="ml-2 text-[10px] text-muted-foreground opacity-60">{opt.value}</span>
              </div>
              <button
                type="button"
                onClick={() => onToggle(opt.id, !opt.active)}
                title={opt.active ? "Desactivar" : "Activar"}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {opt.active ? <ToggleRight size={20} className="text-primary" /> : <ToggleLeft size={20} />}
              </button>
            </div>
          ))}

          {adding ? (
            <div className="mt-3 space-y-2 rounded-md border border-border bg-input p-3">
              <input
                autoFocus
                placeholder="Etiqueta (ej: No tenía documentos)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className={s.catalogInput}
              />
              <input
                placeholder={`Valor interno (auto: ${newLabel.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || "..."})`}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className={s.catalogInput}
              />
              {error && <p className="text-xs text-rose-400">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={saving || !newLabel.trim()}
                  className="flex-1 rounded-md bg-primary px-3 py-1.5 text-sm font-bold text-background disabled:opacity-50"
                >
                  {saving ? "Guardando…" : "Agregar"}
                </button>
                <button
                  type="button"
                  onClick={() => { setAdding(false); setNewLabel(""); setNewValue(""); setError(null); }}
                  className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Plus size={13} />
              Agregar opción
            </button>
          )}
        </div>
      )}
    </div>
  );
}
