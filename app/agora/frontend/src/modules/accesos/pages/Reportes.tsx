import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Eye, FileSearch2 } from "lucide-react";
import {
  descargarReporteCsv,
  listarReportes,
  obtenerReporteJson,
  type ReportCatalogItem,
} from "../services/reportesService";

type FormState = Record<string, string>;

const PAGE_SIZE = 25;

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

const formatCell = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export default function Reportes() {
  const [reportes, setReportes] = useState<ReportCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>({});
  const [downloading, setDownloading] = useState(false);

  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listarReportes();
        setReportes(data);
        setSelectedId((current) => current ?? data[0]?.id ?? null);
      } catch {
        setError("No se pudo cargar el catálogo de reportes.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const reporteActual = useMemo(
    () => reportes.find((item) => item.id === selectedId) ?? null,
    [reportes, selectedId],
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
    setPreviewRows([]);
    setPreviewTotal(0);
    setPreviewPage(0);
    setPreviewError("");
  }, [reporteActual]);

  const filtrosActivos = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(formState)
          .map(([k, v]) => [k, v.trim()])
          .filter(([, v]) => v.length > 0),
      ),
    [formState],
  );

  const handleDownload = async () => {
    if (!reporteActual) return;
    setDownloading(true);
    setError("");
    try {
      await descargarReporteCsv(reporteActual.id, filtrosActivos);
    } catch {
      setError("No se pudo descargar el reporte.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePreview = async () => {
    if (!reporteActual) return;
    setPreviewLoading(true);
    setPreviewError("");
    setPreviewPage(0);
    try {
      const data = await obtenerReporteJson(reporteActual.id, filtrosActivos);
      setPreviewRows(data.rows ?? []);
      setPreviewTotal(data.total ?? (data.rows ?? []).length);
    } catch {
      setPreviewError("No se pudo obtener la vista previa.");
      setPreviewRows([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const columns = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];
  const totalPages = Math.ceil(previewRows.length / PAGE_SIZE);
  const pageRows = previewRows.slice(previewPage * PAGE_SIZE, (previewPage + 1) * PAGE_SIZE);

  return (
    <section className="space-y-6 text-white">
      <div>
        <h1 className="text-3xl font-bold">Reportes</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Selecciona un reporte, define filtros, visualiza en pantalla o descarga en CSV.
          Las fechas se muestran en hora de Santiago.
        </p>
      </div>

      {loading ? <div className="text-muted-foreground">Cargando catálogo...</div> : null}
      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          {error}
        </div>
      ) : null}

      {!loading && reporteActual ? (
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-border bg-muted p-4">
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
                      active ? "border-secondary bg-card" : "border-border bg-muted hover:bg-card"
                    }`}
                  >
                    <div className="font-medium">{reporte.nombre}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{reporte.id}</div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold">{reporteActual.nombre}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Formatos: {reporteActual.formatos.join(", ").toUpperCase()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={previewLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Eye className="h-4 w-4" />
                    {previewLoading ? "Cargando..." : "Vista previa"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download className="h-4 w-4" />
                    {downloading ? "Generando..." : "Descargar CSV"}
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {reporteActual.filtros.map((field) => (
                  <label key={field} className="flex flex-col gap-2 text-sm">
                    <span className="text-muted-foreground">{labelize(field)}</span>
                    <input
                      type={inferFieldType(field)}
                      value={formState[field] ?? ""}
                      onChange={(e) =>
                        setFormState((prev) => ({ ...prev, [field]: e.target.value }))
                      }
                      className="rounded-xl border border-border bg-input px-3 py-2 text-foreground placeholder:text-muted-foreground"
                      placeholder={`Filtrar por ${labelize(field).toLowerCase()}`}
                    />
                  </label>
                ))}
              </div>

              {reporteActual.filtros.length === 0 && (
                <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                  <FileSearch2 className="h-5 w-5" />
                  Este reporte no requiere filtros obligatorios.
                </div>
              )}
            </div>

            {previewError && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
                {previewError}
              </div>
            )}

            {previewRows.length > 0 && (
              <div className="rounded-2xl border border-border bg-muted">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    {previewTotal} registros
                    {totalPages > 1 && ` · página ${previewPage + 1} de ${totalPages}`}
                  </span>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
                        disabled={previewPage === 0}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-card disabled:opacity-40"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={previewPage >= totalPages - 1}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:bg-card disabled:opacity-40"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-card">
                        {columns.map((col) => (
                          <th
                            key={col}
                            className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                          >
                            {labelize(col)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((row, i) => (
                        <tr
                          key={i}
                          className="border-b border-border transition-colors last:border-0 hover:bg-card"
                        >
                          {columns.map((col) => (
                            <td
                              key={col}
                              className="max-w-[240px] truncate whitespace-nowrap px-3 py-2 text-foreground"
                              title={formatCell(row[col])}
                            >
                              {formatCell(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
