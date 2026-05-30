import React from "react";
import { format, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { Plus } from "lucide-react";
import type { Posteo } from "../types";

const ESTADO_BADGE: Record<string, string> = {
  pendiente:  "bg-muted text-muted-foreground border-border",
  publicado:  "bg-emerald-950/40 text-emerald-400 border-emerald-800",
  error:      "bg-destructive/10 text-destructive border-destructive/40",
  cancelado:  "bg-secondary text-muted-foreground border-border",
};

interface Props {
  fecha: Date;
  posteos: Posteo[];
  onNuevo: (fecha: string) => void;
  onEditar: (posteo: Posteo) => void;
}

export const CalendarioDia: React.FC<Props> = ({
  fecha,
  posteos,
  onNuevo,
  onEditar,
}) => {
  const fechaISO = format(fecha, "yyyy-MM-dd");
  const titulo = format(fecha, "EEEE d 'de' MMMM yyyy", { locale: es });

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <h2
          className={`text-lg font-bold capitalize ${
            isToday(fecha) ? "text-primary" : "text-foreground"
          }`}
        >
          {titulo}
        </h2>
        <button
          type="button"
          onClick={() => onNuevo(fechaISO)}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-card hover:text-white"
        >
          <Plus size={13} />
          Nuevo posteo
        </button>
      </div>

      {/* Lista de posteos */}
      {posteos.length === 0 ? (
        <p className="rounded-xl border border-border bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
          Sin posteos para este día. Usa el botón + para agregar uno.
        </p>
      ) : (
        <div className="space-y-3">
          {posteos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onEditar(p)}
              className="w-full rounded-2xl border border-border bg-muted p-4 text-left transition hover:bg-card"
            >
              <div className="flex items-start gap-4">
                {p.url_imagen && (
                  <img
                    src={p.url_imagen}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-xl border border-border object-cover"
                    loading="lazy"
                  />
                )}
                <div className="min-w-0 flex-1">
                  {p.caption && (
                    <p className="mb-2 text-sm text-foreground line-clamp-3">
                      {p.caption}
                    </p>
                  )}
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${
                      ESTADO_BADGE[p.estado] ?? ESTADO_BADGE.pendiente
                    }`}
                  >
                    {p.estado}
                  </span>
                  {p.id_post && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      Post ID: {p.id_post}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
