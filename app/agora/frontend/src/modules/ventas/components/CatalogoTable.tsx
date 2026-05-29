import React from "react";
import { CirclePlus, Pencil, Save, Trash2, X } from "lucide-react";
import type { Offer, ModalidadVenta } from "@/modules/accesos/types/salesRecord";
import { MODALIDADES, MODALIDAD_LABELS, PUNTOS_VALIDOS } from "@/modules/accesos/types/salesRecord";
import { INPUT_CLS, SELECT_CLS } from "../constants";

interface Props {
  catalogo: Offer[];
  editandoId: number | null;
  form: Partial<Offer>;
  onFormChange: (patch: Partial<Offer>) => void;
  onAgregar: () => void;
  onEdit: (o: Offer) => void;
  onCancel: () => void;
  onGuardar: () => void;
  onEliminar: (id: number) => void;
}

export const CatalogoTable: React.FC<Props> = ({
  catalogo,
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
        <h2 className="text-xl font-bold text-white">Catálogo de ofertas</h2>
        <p className="mt-1 text-sm text-[#999999]">Códigos de oferta, modalidad, nivel y puntos por venta.</p>
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
            <th className="px-4 py-3">Código</th>
            <th className="px-4 py-3">Modalidad</th>
            <th className="px-4 py-3">Nivel (1–9)</th>
            <th className="px-4 py-3">Puntos</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1B1B1B]">
          {catalogo.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-[#555555]">Sin ofertas en el catálogo.</td></tr>
          )}
          {catalogo.map((o) => {
            const editing = editandoId === o.id;
            return (
              <tr key={o.id} className="transition hover:bg-[#141414]">
                <td className="px-4 py-3 text-[#999999]">{o.id || "—"}</td>
                <td className="px-4 py-3">
                  {editing
                    ? <input className={INPUT_CLS} value={form.code ?? ""} onChange={(e) => onFormChange({ code: e.target.value })} placeholder="4FU" disabled={o.id !== 0} aria-label="Código" />
                    : <span className="font-mono font-bold text-white">{o.code}</span>}
                </td>
                <td className="px-4 py-3">
                  {editing && o.id === 0
                    ? <select className={SELECT_CLS} value={form.modality ?? "POST_A_POST"} onChange={(e) => onFormChange({ modality: e.target.value as ModalidadVenta })} aria-label="Modalidad">
                        {MODALIDADES.map((m) => <option key={m} value={m}>{MODALIDAD_LABELS[m]}</option>)}
                      </select>
                    : <span className="rounded-full bg-[#1A1A1A] px-2 py-0.5 text-xs text-[#B3B3B3]">{MODALIDAD_LABELS[o.modality]}</span>}
                </td>
                <td className="px-4 py-3">
                  {editing
                    ? <input className={INPUT_CLS} type="number" min={1} max={9} value={form.level ?? ""} onChange={(e) => onFormChange({ level: Number(e.target.value) })} aria-label="Nivel" />
                    : <span className="text-[#CCCCCC]">{o.level}</span>}
                </td>
                <td className="px-4 py-3">
                  {editing
                    ? <select className={SELECT_CLS} value={form.points ?? "1"} onChange={(e) => onFormChange({ points: e.target.value })} aria-label="Puntos">
                        {PUNTOS_VALIDOS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    : <span className="text-[#CCCCCC]">{o.points}</span>}
                </td>
                <td className="px-4 py-3">
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={onGuardar} className="text-emerald-400 hover:text-emerald-300 transition" aria-label="Guardar"><Save size={15} /></button>
                      <button type="button" onClick={onCancel} className="text-[#666666] hover:text-[#B3B3B3] transition" aria-label="Cancelar"><X size={15} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => onEdit(o)} className="text-[#808080] hover:text-white transition" aria-label="Editar"><Pencil size={14} /></button>
                      <button type="button" onClick={() => onEliminar(o.id)} className="text-[#666666] hover:text-red-400 transition" aria-label="Eliminar"><Trash2 size={14} /></button>
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
      Total: {catalogo.filter((o) => o.id !== 0).length} oferta{catalogo.filter((o) => o.id !== 0).length !== 1 ? "s" : ""}
    </p>
  </>
);
