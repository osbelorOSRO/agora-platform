import React, { useState } from "react";
import { ChevronDown, ChevronUp, Save, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAuthHeaders } from "@/utils/getAuthHeaders";
import { unwrapEnvelope } from "@/lib/apiClient";
import { env } from "@/lib/env";
import { s } from "../styles";
import { AGE_RANGE_OPTIONS, LEAD_TYPE_OPTIONS, RESULT_OPTIONS, SEX_OPTIONS } from "../constants";
import type { SalesAnalysisUpdate } from "@/types/metaInbox";

type Plan = { codigo: string; nombre: string | null };
type CatalogOption = { id: string; category: string; value: string; label: string; sortOrder: number; active: boolean };

function useCatalog(category: string, enabled: boolean) {
  return useQuery<CatalogOption[]>({
    queryKey: ["leadCatalog", category],
    queryFn: async () => {
      const res = await fetch(`${env.apiUrl}/meta-inbox/lead-catalog`, { headers: getAuthHeaders() });
      if (!res.ok) return [];
      const all: CatalogOption[] = unwrapEnvelope(await res.json()) ?? [];
      return all.filter((o) => o.category === category && o.active).sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    },
    staleTime: 5 * 60_000,
    enabled,
  });
}

interface Props {
  form: SalesAnalysisUpdate;
  saving: boolean;
  saved: boolean;
  onChange: (patch: Partial<SalesAnalysisUpdate>) => void;
  onToggleTag: (tag: string) => void;
  onSave: () => void;
}

export const SalesAnalysisPanel: React.FC<Props> = ({ form, saving, saved, onChange, onToggleTag, onSave }) => {
  const [open, setOpen] = useState(false);

  const { data: customerTypes = [] }  = useCatalog("customer_type",   open);
  const { data: purchaseIntents = [] } = useCatalog("purchase_intent", open);
  const { data: saleTypes = [] }      = useCatalog("sale_type",       open);
  const { data: lossReasons = [] }    = useCatalog("loss_reason",     open);
  const { data: verbTags = [] }       = useCatalog("verbalization_tag", open);

  const { data: planes = [] } = useQuery<Plan[]>({
    queryKey: ["offers", "list"],
    queryFn: async () => {
      const res = await fetch(`${env.apiUrl}/offers`, { headers: getAuthHeaders() });
      if (!res.ok) return [];
      const json = await res.json();
      const arr = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      return arr as Plan[];
    },
    staleTime: 5 * 60_000,
    enabled: open,
  });

  const isGanado  = form.result === "GANADO";
  const isPerdido = form.result === "PERDIDO";
  const tags      = form.verbalizationTags ?? [];

  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-xs font-medium text-muted-foreground">Análisis de venta</span>
        {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="flex flex-col gap-2 border-t border-border px-3 pb-3 pt-2">

          <Field label="Tipo de lead">
            <select className={s.contactInput} value={form.leadType ?? "DESCONOCIDO"} onChange={(e) => onChange({ leadType: e.target.value })}>
              {LEAD_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          <Field label="Rango de edad">
            <select className={s.contactInput} value={form.ageRange ?? "NO_DEFINIDO"} onChange={(e) => onChange({ ageRange: e.target.value })}>
              {AGE_RANGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          <Field label="Sexo">
            <select className={s.contactInput} value={form.sex ?? "NO_IDENTIFICADO"} onChange={(e) => onChange({ sex: e.target.value })}>
              {SEX_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          <Field label="Tipo de cliente">
            <select className={s.contactInput} value={form.customerType ?? "NO_DEFINIDO"} onChange={(e) => onChange({ customerType: e.target.value })}>
              {customerTypes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          <Field label="Intención de contratación">
            <select className={s.contactInput} value={form.purchaseIntent ?? "NO_DEFINIDO"} onChange={(e) => onChange({ purchaseIntent: e.target.value })}>
              {purchaseIntents.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          <Field label="Resultado del lead">
            <select className={s.contactInput} value={form.result ?? "EN_PROCESO"} onChange={(e) => onChange({ result: e.target.value })}>
              {RESULT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          {isGanado && (
            <>
              <Field label="Plan contratado">
                <select className={s.contactInput} value={form.planContracted ?? ""} onChange={(e) => onChange({ planContracted: e.target.value || null })}>
                  <option value="">Sin seleccionar</option>
                  {planes.map((p) => (
                    <option key={p.codigo} value={p.codigo}>
                      {p.codigo}{p.nombre ? ` — ${p.nombre}` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Modalidad">
                <select className={s.contactInput} value={form.saleType ?? "NO_DEFINIDO"} onChange={(e) => onChange({ saleType: e.target.value === "NO_DEFINIDO" ? null : e.target.value })}>
                  {saleTypes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            </>
          )}

          {isPerdido && (
            <Field label="Motivo de pérdida">
              <select className={s.contactInput} value={form.lossReason ?? ""} onChange={(e) => onChange({ lossReason: e.target.value || null })}>
                <option value="">Sin seleccionar</option>
                {lossReasons.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          )}

          <div>
            <div className="mb-1.5 text-[10px] font-medium text-muted-foreground">Tags de verbalización</div>
            <div className="flex flex-wrap gap-1.5">
              {verbTags.map((o) => {
                const active = tags.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => onToggleTag(o.value)}
                    className={active ? s.tagActive : s.tagInactive}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Verbalización textual">
            <textarea
              className={s.contactTextarea}
              placeholder="Pega frases exactas del cliente, una por línea…"
              value={form.verbalizationText ?? ""}
              onChange={(e) => onChange({ verbalizationText: e.target.value || null })}
            />
          </Field>

          <button type="button" onClick={onSave} disabled={saving} className={s.contactSave}>
            {saved ? (
              <><CheckCircle size={16} className="text-emerald-400" /><span className="text-emerald-400">Guardado</span></>
            ) : (
              <><Save size={16} />{saving ? "Guardando…" : "Guardar análisis"}</>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div className="mb-1 text-[10px] font-medium text-muted-foreground">{label}</div>
    {children}
  </div>
);
