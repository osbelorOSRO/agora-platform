import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import tarjetaCierreProcesoService from "@/services/tarjetas/tarjeta.cierre.proceso.service";
import { getTokenData } from "@/utils/getTokenData";
import { Save, CheckCircle2 } from "lucide-react";
import SidePanel from "@/components/SidePanel";
import { estilos } from "@/theme/estilos";

const tipoProcesoOpciones = [
  "Consulta general",
  "PQR",
  "Alta",
  "Salta",
  "Portabilidad",
  "Portabilidad Post a Post",
  "Portabilidad Pre a Post",
  "Factibilidad Hogar",
  "Duo",
  "Trio",
  "Fibra Optica",
];

const tipoCierreOpciones = [
  "Abandono",
  "Crédito equipo",
  "Cambio de planes",
  "No acepta ofertas",
  "No cumple requisitos",
  "No realiza Biometria",
  "Sin cobertura envío",
  "Sin oficinas disponibles para retiro",
  "Sin factibilidad comercial",
  "Sin factibilidad líneas",
  "Sin factibilidad técnica",
  "Biometría rechazada",
  "Error en sistema",
  "Envío rechazado",
  "Error en logistica por deuda",
  "Codigo BO caducado",
  "Portabilidad exitosa",
  "Alta exitosa",
  "Salta exitosa",
  "Instalacion exitosa",
];

interface Props {
  clienteId: string;
  procesoId: string;
  onClose: () => void;
  onProcesoCerrado?: () => void; // 🔥 NUEVO: Callback cuando se cierra exitosamente
}

const TarjetaCierreProceso: React.FC<Props> = ({ 
  clienteId, 
  procesoId, 
  onClose,
  onProcesoCerrado, // 🔥 NUEVO
}) => {
  const [tipoProceso, setTipoProceso] = useState("");
  const [tipoCierre, setTipoCierre] = useState("");
  const [abandono, setAbandono] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const cerrarProceso = async () => {
    setError(null);
    setCargando(true);
    try {
      const tokenData = getTokenData();
      const cerrado_por_id = (tokenData as any)?.usuario_id ?? tokenData?.id ?? 0;
      const payload = {
        proceso_id: procesoId,
        tipo_proceso: tipoProceso,
        tipo_cierre: tipoCierre,
        abandono,
        cerrado_por_id,
        fuente: "panel",
      };

      const res = await tarjetaCierreProcesoService.cerrarProceso(payload);
      if (res?.success) {
        setGuardado(true);
        
        // 🔥 NUEVO: Esperar 1 segundo y cerrar automáticamente
        setTimeout(() => {
          if (onProcesoCerrado) {
            onProcesoCerrado(); // Notificar al padre (FloatingChat)
          }
          onClose(); // Cerrar el panel
        }, 1000);
      } else {
        setError(res?.message ?? "No se pudo cerrar el proceso");
      }
    } catch (e: any) {
      setError(e?.message ?? "Error al cerrar proceso");
    } finally {
      setCargando(false);
    }
  };

  if (!procesoId) return null;

  return (
    <SidePanel
      open={true}
      onClose={onClose}
      title="Gestión de procesos"
      width={420}
      className={estilos.tarjetaCierreProceso.lateral}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs opacity-70">
            Cliente: <span className="font-medium">{clienteId}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={estilos.tarjetaCierreProceso.botonCancelar}
              disabled={cargando} // 🔥 Deshabilitar mientras se cierra
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={cerrarProceso}
              disabled={guardado || cargando}
              className={`
                px-3 py-2 rounded-lg inline-flex items-center gap-2
                ${guardado ? "bg-green-600 text-white opacity-90" : estilos.tarjetaCierreProceso.botonGuardar}
              `}
              title={guardado ? "Cerrado" : "Cerrar"}
            >
              {guardado ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {guardado ? "Cerrado ✓" : cargando ? "Cerrando..." : "Cerrar"}
            </button>
          </div>
        </div>
      }
    >
      <div className={estilos.tarjetaCierreProceso.contenido}>
        <div>
          <Label className={estilos.tarjetaCierreProceso.label}>Tipo de Proceso</Label>
          <select
            className={estilos.tarjetaCierreProceso.input}
            value={tipoProceso}
            onChange={(e) => setTipoProceso(e.target.value)}
            disabled={cargando || guardado} // 🔥 Deshabilitar cuando está cerrando
          >
            <option value="">Selecciona proceso...</option>
            {tipoProcesoOpciones.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label className={estilos.tarjetaCierreProceso.label}>Tipo de Cierre</Label>
          <select
            className={estilos.tarjetaCierreProceso.input}
            value={tipoCierre}
            onChange={(e) => setTipoCierre(e.target.value)}
            disabled={cargando || guardado} // 🔥 Deshabilitar cuando está cerrando
          >
            <option value="">Selecciona cierre...</option>
            {tipoCierreOpciones.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className={estilos.tarjetaCierreProceso.abandonoContenedor}>
          <div>
            <Label className={estilos.tarjetaCierreProceso.label}>¿Abandono?</Label>
            <p className={estilos.tarjetaCierreProceso.abandonoTexto}>
              Marca si el cliente abandonó el proceso (no responde / no continúa).
            </p>
          </div>
          <Switch 
            checked={abandono} 
            onCheckedChange={setAbandono}
            disabled={cargando || guardado} // 🔥 Deshabilitar cuando está cerrando
          />
        </div>

        {error && <div className={estilos.tarjetaCierreProceso.alertaError}>{error}</div>}
        
        {/* 🔥 NUEVO: Mensaje de éxito */}
        {guardado && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
            ✓ Proceso cerrado exitosamente. El cliente se moverá a inactivos automáticamente.
          </div>
        )}
      </div>
    </SidePanel>
  );
};

export default TarjetaCierreProceso;
