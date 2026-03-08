import { useMemo, useState } from "react";
import { PlusCircle, Send, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TarjetaScrapingService,
  ScraperPayload,
  ScraperResponse,
} from "@/services/tarjetas/tarjeta.scraping.service";
import { notificarError, notificarExito } from "@/utils/notificaciones";
import SidePanel from "@/components/SidePanel";
import { estilos } from "@/theme/estilos";

interface Props {
  procesoId: string;
  onClose: () => void;
}

type ResultadoLinea = {
  numero?: string;
  tipo_linea_detectado?: string;
  factible_linea?: boolean;
  compania?: string;
  descripcion?: string;
};

function TarjetaScraping({ procesoId, onClose }: Props) {
  const [rut, setRut] = useState("");
  const [modo, setModo] = useState<
    "habilitacion" | "portabilidad_postpago" | "portabilidad_prepago"
  >("portabilidad_postpago");
  const [lineas, setLineas] = useState<string[]>([""]);
  const [resultado, setResultado] = useState<ScraperResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const [openComercial, setOpenComercial] = useState(true);
  const [openLineas, setOpenLineas] = useState(true);
  const [tabLinea, setTabLinea] = useState(0);

  const agregarLinea = () => setLineas((prev) => [...prev, ""]);
  const actualizarLinea = (i: number, v: string) => {
    const arr = [...lineas];
    arr[i] = v;
    setLineas(arr);
  };

  const lineasNormalizadas = useMemo(() => {
    const limpias = lineas
      .map((l) => (l || "").trim())
      .filter((l) => l.replace(/\D/g, "").length >= 8);

    return limpias.map((l) => {
      const digits = l.replace(/\D/g, "");
      const ult9 = digits.slice(-9);
      return `+56${ult9}`;
    });
  }, [lineas]);

  const tipo: ScraperPayload["tipo"] = lineasNormalizadas.length > 1 ? "multilinea" : "venta_movil";
  const mostrarTarjetaLineas = lineasNormalizadas.length > 0;

  async function evaluar() {
    try {
      setCargando(true);
      setError(null);
      setResultado(null);

      const payload: ScraperPayload = {
        id: procesoId,
        tipo,
        modo,
        rut,
        lineas: lineasNormalizadas,
      };

      const data = await TarjetaScrapingService.evaluarScrapingSync(payload);
      setResultado(data);
      if (data.status === "completado") {
        notificarExito("Evaluación completada");
      } else if (data.mensaje) {
        notificarError(data.mensaje);
      }
    } catch (e: any) {
      const msg = e?.message ?? "Error al evaluar scraping";
      setError(msg);
      notificarError(msg);
    } finally {
      setCargando(false);
    }
  }

  const r: any = resultado?.resultado ?? null;
  const lineasDonante: ResultadoLinea[] = Array.isArray(r?.linea_donante) ? r!.linea_donante : [];
  const lineaActual = lineasDonante[tabLinea];

  return (
    <SidePanel
      open={true}
      onClose={onClose}
      title="Scraping MovistarClick"
      width={420}
      className={estilos.tarjetaScraping.lateral}
      // sin footer para mas espacio
    >
      <div className={`${estilos.tarjetaScraping.contenido} space-y-4`}>

        {/* RUT */}
        <div>
          <label className={estilos.tarjetaScraping.label}>RUT a evaluar</label>
          <input
            type="text"
            value={rut}
            onChange={(e) => setRut(e.target.value)}
            className={estilos.tarjetaScraping.input}
            placeholder="Ej: 12.345.678-9"
            autoComplete="off"
          />
        </div>

        {/* Modo */}
        <div>
          <label className={estilos.tarjetaScraping.label}>Modo</label>
          <select
            value={modo}
            onChange={(e) => setModo(e.target.value as any)}
            className={estilos.tarjetaScraping.input}
          >
            <option value="habilitacion">habilitacion</option>
            <option value="portabilidad_postpago">portabilidad_postpago</option>
            <option value="portabilidad_prepago">portabilidad_prepago</option>
          </select>
        </div>

        {/* Líneas */}
        <div>
          <label className={estilos.tarjetaScraping.label}>Líneas</label>
          <div className="grid gap-2">
            {lineas.map((linea, index) => (
              <input
                key={index}
                type="text"
                placeholder={`Línea ${index + 1} (9 dígitos o +569XXXXXXXX)`}
                value={linea}
                onChange={(e) => actualizarLinea(index, e.target.value)}
                className={estilos.tarjetaScraping.input}
                autoComplete="off"
              />
            ))}
          </div>

          <button
            onClick={agregarLinea}
            className={estilos.tarjetaScraping.botonAgregarLinea}
            type="button"
          >
            <PlusCircle className={estilos.tarjetaScraping.iconoAgregarLinea} />
            Agregar otra línea
          </button>
        </div>

        {/* Evaluar */}
        <div>
          <button
            onClick={evaluar}
            className={estilos.tarjetaScraping.botonEvaluar}
            disabled={cargando}
            type="button"
            title="Evaluar factibilidad"
          >
            {cargando ? (
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <Send className={estilos.tarjetaScraping.iconoEvaluar} />
              </motion.span>
            ) : (
              <Send className={estilos.tarjetaScraping.iconoEvaluar} />
            )}
            {cargando ? "Evaluando..." : "Evaluar factibilidad"}
          </button>
        </div>

        {/* Errores generales */}
        {error && (
          <div className={estilos.tarjetaScraping.errorGeneral}>
            <AlertTriangle className={estilos.tarjetaScraping.iconoError} />
            <span className={estilos.tarjetaScraping.textoError}>{error}</span>
          </div>
        )}

        {/* RESULTADOS */}
        <div className={estilos.tarjetaScraping.tarjetaContenedor}>
          {/* Tarjeta 1: Factibilidad comercial */}
          {resultado && (
            <div className={estilos.tarjetaScraping.tarjeta}>
              <button
                type="button"
                onClick={() => setOpenComercial((v) => !v)}
                className={estilos.tarjetaScraping.btnToggle}
              >
                <div className="flex items-center gap-2">
                  {r && r.factible === true ? (
                    <CheckCircle2 className={estilos.tarjetaScraping.iconoVerdad} />
                  ) : r && r.factible === false ? (
                    <XCircle className={estilos.tarjetaScraping.iconoFalso} />
                  ) : (
                    <AlertTriangle className={estilos.tarjetaScraping.iconoAdvertencia} />
                  )}
                  <span className={estilos.tarjetaScraping.tituloTarjeta}>Factibilidad comercial</span>
                </div>
              </button>

              <AnimatePresence initial={false}>
                {openComercial && (
                  <motion.div
                    key="comercial"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-3 pb-3"
                  >
                    {!r ? (
                      <BannerInfo mensaje={resultado.mensaje ?? "Sin datos comerciales."} />
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <Kpi label="RUT scrapeado" value={r.rut} />
                        <Kpi label="Límite de crédito" value={numFmt(r.limite_credito ?? r.cupo_credito)} />
                        <Kpi label="Clasificación" value={r.clasificacion} />
                        <Kpi label="Puntaje de riesgo" value={r.puntaje_riesgo != null ? String(r.puntaje_riesgo) : undefined} />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Tarjeta 2: Factibilidad de la línea */}
          {resultado && mostrarTarjetaLineas && (
            <div className={estilos.tarjetaScraping.tarjeta}>
              <button
                type="button"
                onClick={() => setOpenLineas((v) => !v)}
                className={estilos.tarjetaScraping.btnToggle}
              >
                <div className="flex items-center gap-2">
                  {Array.isArray(lineasDonante) && lineasDonante.length > 0 ? (
                    lineasDonante.every((l) => l?.factible_linea === true) ? (
                      <CheckCircle2 className={estilos.tarjetaScraping.iconoVerdad} />
                    ) : lineasDonante.some((l) => l?.factible_linea === false) ? (
                      <XCircle className={estilos.tarjetaScraping.iconoFalso} />
                    ) : (
                      <AlertTriangle className={estilos.tarjetaScraping.iconoAdvertencia} />
                    )
                  ) : (
                    <AlertTriangle className={estilos.tarjetaScraping.iconoAdvertencia} />
                  )}
                  <span className={estilos.tarjetaScraping.tituloTarjeta}>Factibilidad de la línea</span>
                </div>
              </button>

              <AnimatePresence initial={false}>
                {openLineas && (
                  <motion.div
                    key="lineas"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-3 pb-3"
                  >
                    {lineasDonante.length > 1 && (
                      <div className="flex gap-2 mb-3 overflow-x-auto">
                        {lineasDonante.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setTabLinea(i)}
                            className={`${estilos.tarjetaScraping.btnTabLinea} ${
                              tabLinea === i ? estilos.tarjetaScraping.btnTabLineaActivo : ""
                            }`}
                          >
                            Línea {i + 1}
                          </button>
                        ))}
                      </div>
                    )}

                    {lineasDonante.length > 0 ? (
                      <LineaDetalle linea={lineaActual} />
                    ) : (
                      <BannerInfo mensaje={resultado.mensaje ?? "Sin datos de factibilidad de línea."} />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </SidePanel>
  );
}

function Kpi({ label, value }: { label: string; value?: string }) {
  if (value == null || value === "") return null;
  return (
    <div className={estilos.tarjetaScraping.kpi}>
      <div className={estilos.tarjetaScraping.kpiLabel}>{label}</div>
      <div className={estilos.tarjetaScraping.kpiValue}>{value}</div>
    </div>
  );
}

function LineaDetalle({ linea }: { linea?: ResultadoLinea }) {
  if (!linea || Object.keys(linea).length === 0) {
    return <BannerInfo mensaje="Sin datos para esta línea." />;
  }

  const ok = linea.factible_linea === true;
  const fail = linea.factible_linea === false;

  return (
    <div className={estilos.tarjetaScraping.lineaDetalle}>
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className={estilos.tarjetaScraping.iconoVerdad} />
        ) : fail ? (
          <XCircle className={estilos.tarjetaScraping.iconoFalso} />
        ) : (
          <AlertTriangle className={estilos.tarjetaScraping.iconoAdvertencia} />
        )}
        <span className={estilos.tarjetaScraping.lineaDetalleTitulo}>Factibilidad línea</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Kpi label="Número" value={linea.numero} />
        <Kpi label="Compañía" value={linea.compania} />
        <Kpi label="Descripción" value={linea.descripcion} />
      </div>
    </div>
  );
}

function BannerInfo({ mensaje }: { mensaje: string }) {
  return (
    <div className={estilos.tarjetaScraping.bannerInfo}>
      <AlertTriangle className={estilos.tarjetaScraping.bannerInfoIcono} />
      <span className={estilos.tarjetaScraping.bannerInfoTexto}>{mensaje}</span>
    </div>
  );
}

function numFmt(n?: number) {
  if (n == null) return undefined;
  try {
    return new Intl.NumberFormat("es-CL").format(n);
  } catch {
    return String(n);
  }
}

export default TarjetaScraping;

