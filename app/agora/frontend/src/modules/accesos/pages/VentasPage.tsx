import { CirclePlus, Upload } from "lucide-react";
import { useVentasPage } from "@/modules/ventas/hooks/useVentasPage";
import { PuntosCard } from "@/modules/ventas/components/PuntosCard";
import { VentasTable } from "@/modules/ventas/components/VentasTable";
import { CsvImportBanner } from "@/modules/ventas/components/CsvImportBanner";
import { CatalogoTable } from "@/modules/ventas/components/CatalogoTable";
import { PreciosTable } from "@/modules/ventas/components/PreciosTable";
import { RegistrarVentaModal } from "@/modules/ventas/components/RegistrarVentaModal";
import type { Tab } from "@/modules/ventas/constants";

const TABS: { key: Tab; label: string }[] = [
  { key: "ventas", label: "Ventas" },
  { key: "catalogo", label: "Catálogo" },
  { key: "precios", label: "Matriz de Precios" },
];

export default function VentasPage() {
  const p = useVentasPage();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Ventas</h1>
        <p className="mt-2 text-sm text-[#999999]">
          Registro manual de ventas, catálogo de ofertas y matriz de precios.
        </p>
      </div>

      <div className="flex gap-1 rounded-xl border border-[#2D2D2D] bg-[#0A0A0A] p-1 w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => p.setTab(key)}
            aria-pressed={p.tab === key}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              p.tab === key ? "bg-[#1A1A1A] text-white" : "text-[#666666] hover:text-[#B3B3B3]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {p.tab === "ventas" && (
        <>
          <PuntosCard
            mesNombre={p.mesNombre}
            puntos={p.puntos}
            onPrev={p.goPrev}
            onNext={p.goNext}
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-[#4D4D4D]">
              {p.ventas.length} venta{p.ventas.length !== 1 ? "s" : ""} en {p.mesNombre}
            </p>
            <div className="flex items-center gap-2">
              <input ref={p.csvInputRef} type="file" accept=".csv" className="hidden" onChange={p.handleImportCSV} />
              <button
                type="button"
                onClick={() => p.csvInputRef.current?.click()}
                disabled={p.importando}
                className="flex items-center gap-2 rounded-xl border border-[#2D2D2D] bg-[#141414] px-4 py-2 text-sm font-medium text-[#B3B3B3] transition hover:bg-[#1A1A1A] hover:text-white disabled:opacity-50"
              >
                <Upload size={15} />
                {p.importando ? "Importando..." : "Importar CSV"}
              </button>
              <button
                type="button"
                onClick={() => p.setModalVenta(true)}
                className="flex items-center gap-2 rounded-xl border border-[#2D2D2D] bg-[#141414] px-4 py-2 text-sm font-medium text-[#B3B3B3] transition hover:bg-[#1A1A1A] hover:text-white"
              >
                <CirclePlus size={15} />
                Registrar venta
              </button>
            </div>
          </div>

          {p.resultadoImport && (
            <CsvImportBanner result={p.resultadoImport} onClose={() => p.setResultadoImport(null)} />
          )}

          <VentasTable
            ventas={p.ventas}
            mesNombre={p.mesNombre}
            editandoId={p.editandoVentaId}
            form={p.formVenta}
            onFormChange={(patch) => p.setFormVenta((prev) => ({ ...prev, ...patch }))}
            onEdit={p.handleEditVenta}
            onCancel={p.handleCancelVenta}
            onGuardar={p.handleGuardarVenta}
            onEliminar={p.handleEliminarVenta}
          />
        </>
      )}

      {p.tab === "catalogo" && (
        <CatalogoTable
          catalogo={p.catalogo}
          editandoId={p.editandoCatId}
          form={p.formCat}
          onFormChange={(patch) => p.setFormCat((prev) => ({ ...prev, ...patch }))}
          onAgregar={p.handleAgregarCat}
          onEdit={p.handleEditCat}
          onCancel={p.handleCancelCat}
          onGuardar={p.handleGuardarCat}
          onEliminar={p.handleEliminarCat}
        />
      )}

      {p.tab === "precios" && (
        <PreciosTable
          precios={p.precios}
          editandoId={p.editandoPrecioId}
          form={p.formPrecio}
          onFormChange={(patch) => p.setFormPrecio((prev) => ({ ...prev, ...patch }))}
          onAgregar={p.handleAgregarPrecio}
          onEdit={p.handleEditPrecio}
          onCancel={p.handleCancelPrecio}
          onGuardar={p.handleGuardarPrecio}
          onEliminar={p.handleEliminarPrecio}
        />
      )}

      {p.modalVenta && (
        <RegistrarVentaModal
          form={p.nuevaVenta}
          cargando={p.cargandoVenta}
          onFormChange={(patch) => p.setNuevaVenta((prev) => ({ ...prev, ...patch }))}
          onGuardar={p.handleCrearVenta}
          onClose={() => { p.setModalVenta(false); p.setNuevaVenta({ fecha: "", run: "", full_name: "", phone: "", address: "", city: "", province: "", country: "Chile", contract_number: "", modality: "POST_A_POST", offers_code: "" }); }}
        />
      )}
    </section>
  );
}
