import React, { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange, Calendar } from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { CalendarioMes } from "@/modules/socialPostings/components/CalendarioMes";
import { CalendarioSemana } from "@/modules/socialPostings/components/CalendarioSemana";
import { CalendarioDia } from "@/modules/socialPostings/components/CalendarioDia";
import { TareaForm } from "@/modules/socialPostings/components/TareaForm";
import { useSocialPostings } from "@/modules/socialPostings/hooks/useSocialPostings";
import type { Posteo, VistaCalendario, CreatePosteoDto, UpdatePosteoDto } from "@/modules/socialPostings/types";

export default function SocialPostingsPage() {
  const [vista, setVista] = useState<VistaCalendario>("mes");
  const [fechaBase, setFechaBase] = useState(new Date());

  // mes activo para la query
  const mes = format(fechaBase, "yyyy-MM");
  const { posteos, isLoading, creando, actualizando, crear, actualizar, eliminar } =
    useSocialPostings(mes);

  // Form state
  const [formFecha, setFormFecha] = useState<string | null>(null);
  const [editandoPosteo, setEditandoPosteo] = useState<Posteo | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Navegación ────────────────────────────────────────────────────────────

  const navPrev = () => {
    if (vista === "mes") setFechaBase((d) => subMonths(d, 1));
    else if (vista === "semana") setFechaBase((d) => subWeeks(d, 1));
    else setFechaBase((d) => subDays(d, 1));
  };

  const navNext = () => {
    if (vista === "mes") setFechaBase((d) => addMonths(d, 1));
    else if (vista === "semana") setFechaBase((d) => addWeeks(d, 1));
    else setFechaBase((d) => addDays(d, 1));
  };

  const tituloNav = () => {
    if (vista === "mes")
      return format(fechaBase, "MMMM yyyy", { locale: es });
    if (vista === "semana") {
      const lun = startOfWeek(fechaBase, { weekStartsOn: 1 });
      const dom = endOfWeek(fechaBase, { weekStartsOn: 1 });
      return `${format(lun, "d MMM", { locale: es })} – ${format(dom, "d MMM yyyy", { locale: es })}`;
    }
    return format(fechaBase, "EEEE d 'de' MMMM", { locale: es });
  };

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleNuevo = (fecha: string) => {
    setEditandoPosteo(null);
    setFormFecha(fecha);
    setFormError(null);
  };

  const handleEditar = (posteo: Posteo) => {
    setEditandoPosteo(posteo);
    setFormFecha(posteo.fecha);
    setFormError(null);
  };

  const handleGuardar = async (dto: CreatePosteoDto | UpdatePosteoDto) => {
    setFormError(null);
    try {
      if (editandoPosteo) {
        await actualizar({ id: editandoPosteo.id, dto: dto as UpdatePosteoDto });
      } else {
        await crear(dto as CreatePosteoDto);
      }
      setFormFecha(null);
      setEditandoPosteo(null);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const handleEliminar = async (posteo: Posteo) => {
    if (!confirm(`¿Eliminar el posteo del ${posteo.fecha}?`)) return;
    await eliminar(posteo.id);
    setFormFecha(null);
    setEditandoPosteo(null);
  };

  const cerrarForm = () => {
    setFormFecha(null);
    setEditandoPosteo(null);
    setFormError(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="space-y-6 text-white">
      {/* Título */}
      <div>
        <h1 className="text-3xl font-bold">Calendario de posteos</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Planifica los posteos de la Fan Page. N8N ejecuta las tareas pendientes cada noche a las 11 PM.
        </p>
      </div>

      {/* Barra de navegación */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Navegación temporal */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={navPrev}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition hover:bg-card hover:text-white"
            aria-label="Anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[200px] text-center text-sm font-semibold capitalize">
            {tituloNav()}
          </span>
          <button
            type="button"
            onClick={navNext}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition hover:bg-card hover:text-white"
            aria-label="Siguiente"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => setFechaBase(new Date())}
            className="rounded-lg border border-border bg-muted px-3 py-1 text-xs text-muted-foreground transition hover:bg-card hover:text-white"
          >
            Hoy
          </button>
        </div>

        {/* Toggle de vista */}
        <div className="flex rounded-xl border border-border bg-muted p-1 gap-1">
          {(["mes", "semana", "dia"] as VistaCalendario[]).map((v) => {
            const Icon = v === "mes" ? CalendarDays : v === "semana" ? CalendarRange : Calendar;
            const label = v === "mes" ? "Mes" : v === "semana" ? "Semana" : "Día";
            return (
              <button
                key={v}
                type="button"
                onClick={() => setVista(v)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  vista === v
                    ? "bg-card text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error de carga */}
      {formError && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formError}
        </p>
      )}

      {/* Calendario */}
      {isLoading ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Cargando calendario…
        </p>
      ) : (
        <>
          {vista === "mes" && (
            <CalendarioMes
              year={fechaBase.getFullYear()}
              month={fechaBase.getMonth() + 1}
              posteos={posteos}
              onNuevo={handleNuevo}
              onEditar={handleEditar}
            />
          )}
          {vista === "semana" && (
            <CalendarioSemana
              fecha={fechaBase}
              posteos={posteos}
              onNuevo={handleNuevo}
              onEditar={handleEditar}
            />
          )}
          {vista === "dia" && (
            <CalendarioDia
              fecha={fechaBase}
              posteos={posteos.filter(
                (p) => p.fecha.slice(0, 10) === format(fechaBase, "yyyy-MM-dd"),
              )}
              onNuevo={handleNuevo}
              onEditar={handleEditar}
            />
          )}
        </>
      )}

      {/* Form de tarea */}
      {formFecha && (
        <TareaForm
          fecha={formFecha}
          posteo={editandoPosteo}
          guardando={creando || actualizando}
          onGuardar={handleGuardar}
          onClose={cerrarForm}
        />
      )}
    </section>
  );
}
