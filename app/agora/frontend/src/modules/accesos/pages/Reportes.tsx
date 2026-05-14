import { useEffect, useMemo, useState } from "react";
import { Download, FileSearch2 } from "lucide-react";
import { descargarReporteCsv, listarReportes, type ReportCatalogItem } from "../services/reportesService";

type FormState = Record<string, string>;

const inferFieldType = (field: string): "date" | "number" | "text" => {
  if (field === "desde" || field === "hasta") return "date";
  if (field.endsWith("_id")) return "number";
  return "text";
};

const labelize = (value: string) =>
  value
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function Reportes() {
  const [reportes, setReportes] = useState<ReportCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>({});
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listarReportes();
        setReportes(data);
        setSelectedId((current) => current ?? data[0]?.id ?? null);
      } catch (err) {
        console.error("Error cargando catálogo de reportes:", err);
        setError("No se pudo cargar el catálogo de reportes.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const reporteActual = useMemo(
    () => reportes.find((item) => item.id === selectedId) ?? null,
    [reportes, selectedId]
  );

  useEffect(() => {
    if (!reporteActual) return;
    setFormState((prev) => {
      const next: FormState = {};
      reporteActual.filtros.forEach((field) => {
        next[field] = prev[field] ?? "";
      });
      return next;
    });
  }, [reporteActual]);

  const handleDownload = async () => {
    if (!reporteActual) return;
    setDownloading(true);
    setError("");

    try {
      const filtros = Object.fromEntries(
        Object.entries(formState)
          .map(([key, value]) => [key, value.trim()])
          .filter(([, value]) => value.length > 0)
      );
      await descargarReporteCsv(reporteActual.id, filtros);
    } catch (err) {
      console.error("Error descargando CSV:", err);
      setError("No se pudo descargar el reporte.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="space-y-6 text-white">
      <div>
        <h1 className="text-3xl font-bold">Reportes</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/80">
          Selecciona un reporte, define filtros y descarga el resultado en CSV.
          Esta vista no genera gráficos; solo extrae datos desde Postgres.
        </p>
      </div>

      {loading ? <div className="text-white/80">Cargando catálogo...</div> : null}
      {error ? <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm">{error}</div> : null}

      {!loading && reporteActual ? (
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 className="mb-4 text-lg font-semibold">Lista de reportes</h2>
            <div className="space-y-2">
              {reportes.map((reporte) => {
                const active = reporte.id === reporteActual.id;
                return (
                  <button
                    key={reporte.id}
                    type="button"
                    onClick={() => setSelectedId(reporte.id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-white/30 bg-white/15"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="font-medium">{reporte.nombre}</div>
                    <div className="mt-1 text-xs text-white/60">{reporte.id}</div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">{reporteActual.nombre}</h2>
                <p className="mt-2 text-sm text-white/70">
                  Formatos disponibles: {reporteActual.formatos.join(", ").toUpperCase()}
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {downloading ? "Generando CSV..." : "Descargar CSV"}
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {reporteActual.filtros.map((field) => (
                <label key={field} className="flex flex-col gap-2 text-sm">
                  <span className="text-white/80">{labelize(field)}</span>
                  <input
                    type={inferFieldType(field)}
                    value={formState[field] ?? ""}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        [field]: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-white placeholder:text-white/30"
                    placeholder={`Filtrar por ${labelize(field).toLowerCase()}`}
                  />
                </label>
              ))}
            </div>

            {reporteActual.filtros.length === 0 ? (
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 p-4 text-sm text-white/75">
                <FileSearch2 className="h-5 w-5" />
                Este reporte no requiere filtros obligatorios.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
