import React from "react";
import { X } from "lucide-react";
import type { CreateSaleDto, ModalidadVenta } from "@/modules/accesos/types/salesRecord";
import { MODALIDADES, MODALIDAD_LABELS } from "@/modules/accesos/types/salesRecord";
import { FORM_INICIAL, MODAL_INPUT_CLS, MODAL_SELECT_CLS } from "../constants";

interface Props {
  form: CreateSaleDto;
  cargando: boolean;
  onFormChange: (patch: Partial<CreateSaleDto>) => void;
  onGuardar: () => void;
  onClose: () => void;
}

export const RegistrarVentaModal: React.FC<Props> = ({
  form,
  cargando,
  onFormChange,
  onGuardar,
  onClose,
}) => {
  const handleClose = () => { onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/90 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-[#2D2D2D] bg-[#141414] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#2D2D2D] px-6 py-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Registrar venta</h3>
          <button onClick={handleClose} className="text-[#666666] hover:text-white transition" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-[#666666] uppercase tracking-wider">Fecha</label>
              <input type="date" className={MODAL_INPUT_CLS} value={form.fecha} onChange={(e) => onFormChange({ fecha: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[#666666] uppercase tracking-wider">Modalidad</label>
              <select className={MODAL_SELECT_CLS} value={form.modality} onChange={(e) => onFormChange({ modality: e.target.value as ModalidadVenta })}>
                {MODALIDADES.map((m) => <option key={m} value={m}>{MODALIDAD_LABELS[m]}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[#666666] uppercase tracking-wider">Código oferta</label>
              <input className={MODAL_INPUT_CLS} placeholder="4FU" value={form.offers_code} onChange={(e) => onFormChange({ offers_code: e.target.value.toUpperCase() })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-[#666666] uppercase tracking-wider">RUN</label>
              <input className={MODAL_INPUT_CLS} placeholder="12345678-9" value={form.run} onChange={(e) => onFormChange({ run: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[#666666] uppercase tracking-wider">Nombre completo</label>
              <input className={MODAL_INPUT_CLS} placeholder="Juan Pérez" value={form.full_name} onChange={(e) => onFormChange({ full_name: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-[#666666] uppercase tracking-wider">Teléfono</label>
              <input className={MODAL_INPUT_CLS} placeholder="912345678" value={form.phone} onChange={(e) => onFormChange({ phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[#666666] uppercase tracking-wider">N° Contrato</label>
              <input className={MODAL_INPUT_CLS} placeholder="C-001" value={form.contract_number} onChange={(e) => onFormChange({ contract_number: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#666666] uppercase tracking-wider">Dirección</label>
            <input className={MODAL_INPUT_CLS} placeholder="Av. Principal 123" value={form.address} onChange={(e) => onFormChange({ address: e.target.value })} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-[#666666] uppercase tracking-wider">Ciudad</label>
              <input className={MODAL_INPUT_CLS} placeholder="Santiago" value={form.city} onChange={(e) => onFormChange({ city: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[#666666] uppercase tracking-wider">Provincia</label>
              <input className={MODAL_INPUT_CLS} placeholder="Santiago" value={form.province} onChange={(e) => onFormChange({ province: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[#666666] uppercase tracking-wider">País</label>
              <input className={MODAL_INPUT_CLS} placeholder="Chile" value={form.country} onChange={(e) => onFormChange({ country: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#2D2D2D] px-6 py-4">
          <button type="button" onClick={handleClose} className="rounded-xl border border-[#2D2D2D] bg-[#0A0A0A] px-4 py-2 text-sm text-[#B3B3B3] hover:text-white transition">
            Cancelar
          </button>
          <button type="button" onClick={onGuardar} disabled={cargando} className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50">
            {cargando ? "Guardando…" : "Registrar"}
          </button>
        </div>
      </div>
    </div>
  );
};
