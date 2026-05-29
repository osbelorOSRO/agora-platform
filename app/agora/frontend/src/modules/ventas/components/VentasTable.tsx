import React from "react";
import { Pencil, Save, Trash2, X } from "lucide-react";
import type { SaleRecord } from "@/modules/accesos/types/salesRecord";
import { MODALIDAD_LABELS } from "@/modules/accesos/types/salesRecord";
import { INPUT_CLS } from "../constants";
import { formatFecha, formatPrecio } from "../utils";

interface Props {
  ventas: SaleRecord[];
  mesNombre: string;
  editandoId: number | null;
  form: Partial<SaleRecord>;
  onFormChange: (patch: Partial<SaleRecord>) => void;
  onEdit: (v: SaleRecord) => void;
  onCancel: () => void;
  onGuardar: () => void;
  onEliminar: (id: number) => void;
}

export const VentasTable: React.FC<Props> = ({
  ventas,
  mesNombre,
  editandoId,
  form,
  onFormChange,
  onEdit,
  onCancel,
  onGuardar,
  onEliminar,
}) => (
  <div className="overflow-x-auto rounded-2xl border border-[#2D2D2D] scrollbar-custom">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[#2D2D2D] bg-[#141414] text-left text-xs font-semibold uppercase tracking-wider text-[#666666]">
          <th className="px-3 py-3">Fecha</th>
          <th className="px-3 py-3">RUN</th>
          <th className="px-3 py-3">Nombre</th>
          <th className="px-3 py-3">Teléfono</th>
          <th className="px-3 py-3">Ciudad</th>
          <th className="px-3 py-3">Provincia</th>
          <th className="px-3 py-3">N° Contrato</th>
          <th className="px-3 py-3">Modalidad</th>
          <th className="px-3 py-3">Código</th>
          <th className="px-3 py-3 text-right">Nivel</th>
          <th className="px-3 py-3 text-right">Pts</th>
          <th className="px-3 py-3 text-right">Precio</th>
          <th className="px-3 py-3" />
        </tr>
      </thead>
      <tbody className="divide-y divide-[#1B1B1B]">
        {ventas.length === 0 && (
          <tr>
            <td colSpan={13} className="px-4 py-8 text-center text-sm text-[#555555]">
              Sin ventas en {mesNombre}.
            </td>
          </tr>
        )}
        {ventas.map((v) => {
          const editing = editandoId === v.id;
          return (
            <tr key={v.id} className="transition hover:bg-[#141414]">
              <td className="px-3 py-3 text-xs text-[#999999] whitespace-nowrap">{formatFecha(v.fecha)}</td>
              <td className="px-3 py-3">
                {editing
                  ? <input className={INPUT_CLS} value={form.run ?? ""} onChange={(e) => onFormChange({ run: e.target.value })} aria-label="RUN" />
                  : <span className="font-mono text-xs text-[#B3B3B3]">{v.run}</span>}
              </td>
              <td className="px-3 py-3">
                {editing
                  ? <input className={INPUT_CLS} value={form.full_name ?? ""} onChange={(e) => onFormChange({ full_name: e.target.value })} aria-label="Nombre" />
                  : <span className="text-white font-medium">{v.full_name}</span>}
              </td>
              <td className="px-3 py-3">
                {editing
                  ? <input className={INPUT_CLS} value={form.phone ?? ""} onChange={(e) => onFormChange({ phone: e.target.value })} aria-label="Teléfono" />
                  : <span className="text-[#B3B3B3]">{v.phone}</span>}
              </td>
              <td className="px-3 py-3">
                {editing
                  ? <input className={INPUT_CLS} value={form.city ?? ""} onChange={(e) => onFormChange({ city: e.target.value })} aria-label="Ciudad" />
                  : <span className="text-[#B3B3B3]">{v.city}</span>}
              </td>
              <td className="px-3 py-3">
                {editing
                  ? <input className={INPUT_CLS} value={form.province ?? ""} onChange={(e) => onFormChange({ province: e.target.value })} aria-label="Provincia" />
                  : <span className="text-[#B3B3B3]">{v.province}</span>}
              </td>
              <td className="px-3 py-3">
                {editing
                  ? <input className={INPUT_CLS} value={form.contract_number ?? ""} onChange={(e) => onFormChange({ contract_number: e.target.value })} aria-label="N° Contrato" />
                  : <span className="font-mono text-xs text-[#B3B3B3]">{v.contract_number}</span>}
              </td>
              <td className="px-3 py-3">
                <span className="rounded-full bg-[#1A1A1A] px-2 py-0.5 text-xs text-[#B3B3B3]">
                  {MODALIDAD_LABELS[v.modality]}
                </span>
              </td>
              <td className="px-3 py-3"><span className="font-mono text-xs text-[#B3B3B3]">{v.offers_code}</span></td>
              <td className="px-3 py-3 text-right text-xs text-[#999999]">{v.level_price}</td>
              <td className="px-3 py-3 text-right text-xs text-[#999999]">{v.points}</td>
              <td className="px-3 py-3 text-right font-semibold text-white whitespace-nowrap">{formatPrecio(v.offers_price)}</td>
              <td className="px-3 py-3">
                {editing ? (
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={onGuardar} className="text-emerald-400 hover:text-emerald-300 transition" aria-label="Guardar"><Save size={15} /></button>
                    <button type="button" onClick={onCancel} className="text-[#666666] hover:text-[#B3B3B3] transition" aria-label="Cancelar"><X size={15} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onEdit(v)} className="text-[#808080] hover:text-white transition" aria-label="Editar"><Pencil size={14} /></button>
                    <button type="button" onClick={() => onEliminar(v.id)} className="text-[#666666] hover:text-red-400 transition" aria-label="Eliminar"><Trash2 size={14} /></button>
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
