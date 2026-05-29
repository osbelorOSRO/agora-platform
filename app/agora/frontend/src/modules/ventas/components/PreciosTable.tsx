import React from "react";
import { CirclePlus, Pencil, Save, Trash2, X } from "lucide-react";
import type { PriceLevel } from "@/modules/accesos/types/salesRecord";
import { RANGO_LABELS } from "@/modules/accesos/types/salesRecord";
import { INPUT_CLS, SELECT_CLS } from "../constants";
import { formatPrecio } from "../utils";

interface Props {
  precios: PriceLevel[];
  editandoId: number | null;
  form: Partial<PriceLevel>;
  onFormChange: (patch: Partial<PriceLevel>) => void;
  onAgregar: () => void;
  onEdit: (p: PriceLevel) => void;
  onCancel: () => void;
  onGuardar: () => void;
  onEliminar: (id: number) => void;
}

export const PreciosTable: React.FC<Props> = ({
  precios,
  editandoId,
  form,
  onFormChange,
  onAgregar,
  onEdit,
  onCancel,
  onGuardar,
  onEliminar,
}) => (
  <>
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-xl font-bold text-white">Matriz de precios</h2>
        <p className="mt-1 text-sm text-[#999999]">
          Precio por nivel (1–9) y rango de puntos. El rango se asigna automáticamente según los puntos del mes.
        </p>
      </div>
      <button
        type="button"
        onClick={onAgregar}
        disabled={editandoId !== null}
        className="flex items-center gap-2 rounded-xl border border-[#2D2D2D] bg-[#141414] px-4 py-2 text-sm font-medium text-[#B3B3B3] transition hover:bg-[#1A1A1A] hover:text-white disabled:opacity-40"
      >
        <CirclePlus size={15} />
        Agregar
      </button>
    </div>

    <div className="overflow-x-auto rounded-2xl border border-[#2D2D2D] scrollbar-custom">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2D2D2D] bg-[#141414] text-left text-xs font-semibold uppercase tracking-wider text-[#666666]">
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">Nivel</th>
            <th className="px-4 py-3">Rango</th>
            <th className="px-4 py-3 text-right">Precio (CLP)</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1B1B1B]">
          {precios.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-[#555555]">Sin entradas de precio configuradas.</td></tr>
          )}
          {precios.map((p) => {
            const editing = editandoId === p.id;
            return (
              <tr key={p.id} className="transition hover:bg-[#141414]">
                <td className="px-4 py-3 text-[#999999]">{p.id || "—"}</td>
                <td className="px-4 py-3">
                  {editing && p.id === 0
                    ? <input className={INPUT_CLS} type="number" min={1} max={9} value={form.level ?? ""} onChange={(e) => onFormChange({ level: Number(e.target.value) })} aria-label="Nivel" />
                    : <span className="text-white font-semibold">{p.level}</span>}
                </td>
                <td className="px-4 py-3">
                  {editing && p.id === 0
                    ? <select className={SELECT_CLS} value={form.range ?? 1} onChange={(e) => onFormChange({ range: Number(e.target.value) })} aria-label="Rango">
                        <option value={1}>Rango 1 (&lt; 20 pts)</option>
                        <option value={2}>Rango 2 (20–34 pts)</option>
                        <option value={3}>Rango 3 (≥ 35 pts)</option>
                      </select>
                    : <span className="text-[#CCCCCC]">{RANGO_LABELS[p.range]}</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  {editing
                    ? <input className={`${INPUT_CLS} text-right`} type="number" min={0} value={form.price ?? ""} onChange={(e) => onFormChange({ price: Number(e.target.value) })} aria-label="Precio" />
                    : <span className="font-semibold text-white">{formatPrecio(p.price)}</span>}
                </td>
                <td className="px-4 py-3">
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={onGuardar} className="text-emerald-400 hover:text-emerald-300 transition" aria-label="Guardar"><Save size={15} /></button>
                      <button type="button" onClick={onCancel} className="text-[#666666] hover:text-[#B3B3B3] transition" aria-label="Cancelar"><X size={15} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => onEdit(p)} className="text-[#808080] hover:text-white transition" aria-label="Editar"><Pencil size={14} /></button>
                      <button type="button" onClick={() => onEliminar(p.id)} className="text-[#666666] hover:text-red-400 transition" aria-label="Eliminar"><Trash2 size={14} /></button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    <p className="text-xs text-[#4D4D4D]">
      Total: {precios.filter((p) => p.id !== 0).length} entrada{precios.filter((p) => p.id !== 0).length !== 1 ? "s" : ""}
    </p>
  </>
);
