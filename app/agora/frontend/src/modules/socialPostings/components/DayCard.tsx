import React from "react";
import { Plus } from "lucide-react";
import type { Posteo } from "../types";

const ESTADO_STYLES: Record<string, string> = {
  pendiente:  "bg-muted border-border text-muted-foreground",
  publicado:  "bg-emerald-950/40 border-emerald-800 text-emerald-400",
  error:      "bg-destructive/10 border-destructive/40 text-destructive",
  cancelado:  "bg-secondary border-border text-muted-foreground line-through",
};

interface Props {
  dia: number;
  fechaISO: string;           // "YYYY-MM-DD"
  esHoy: boolean;
  esMesActual: boolean;
  posteos: Posteo[];
  onNuevo: (fecha: string) => void;
  onEditar: (posteo: Posteo) => void;
}

export const DayCard: React.FC<Props> = ({
  dia,
  fechaISO,
  esHoy,
  esMesActual,
  posteos,
  onNuevo,
  onEditar,
}) => (
  <div
    className={`flex min-h-[100px] flex-col rounded-xl border p-2 transition ${
      esHoy
        ? "border-primary/40 bg-accent"
        : esMesActual
          ? "border-border bg-muted"
          : "border-border/40 bg-background opacity-40"
    }`}
  >
    {/* Cabecera del día */}
    <div className="flex items-center justify-between">
      <span
        className={`text-xs font-bold ${
          esHoy ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {dia}
      </span>
      {esMesActual && (
        <button
          type="button"
          onClick={() => onNuevo(fechaISO)}
          className="rounded-md p-0.5 text-muted-foreground transition hover:bg-card hover:text-white"
          aria-label={`Nuevo posteo ${fechaISO}`}
          title="Nuevo posteo"
        >
          <Plus size={13} />
        </button>
      )}
    </div>

    {/* Tarjetas de posteos */}
    <div className="mt-1 flex flex-col gap-1">
      {posteos.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onEditar(p)}
          className={`w-full rounded-lg border px-1.5 py-1 text-left transition hover:brightness-110 ${
            ESTADO_STYLES[p.estado] ?? ESTADO_STYLES.pendiente
          }`}
        >
          {p.url_imagen && (
            <img
              src={p.url_imagen}
              alt=""
              className="mb-1 h-10 w-full rounded object-cover"
              loading="lazy"
            />
          )}
          {p.caption && (
            <p className="truncate text-[10px] leading-tight">{p.caption}</p>
          )}
          <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-wider opacity-70">
            {p.estado}
          </span>
        </button>
      ))}
    </div>
  </div>
);
