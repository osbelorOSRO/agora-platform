import React from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
  isToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { DayCard } from "./DayCard";
import type { Posteo } from "../types";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// getDay() → 0=Dom; convertir a 0=Lun
const dayIndex = (d: Date) => (getDay(d) + 6) % 7;

interface Props {
  year: number;
  month: number; // 1-12
  posteos: Posteo[];
  onNuevo: (fecha: string) => void;
  onEditar: (posteo: Posteo) => void;
}

export const CalendarioMes: React.FC<Props> = ({
  year,
  month,
  posteos,
  onNuevo,
  onEditar,
}) => {
  const base = new Date(year, month - 1, 1);
  const dias = eachDayOfInterval({ start: startOfMonth(base), end: endOfMonth(base) });
  const offset = dayIndex(dias[0]); // celdas vacías al inicio

  // índice de posteos por fecha
  const porFecha = posteos.reduce<Record<string, Posteo[]>>((acc, p) => {
    const k = p.fecha.slice(0, 10);
    acc[k] = acc[k] ? [...acc[k], p] : [p];
    return acc;
  }, {});

  return (
    <div className="w-full">
      {/* Cabecera días de semana */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {DIAS_SEMANA.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid del mes */}
      <div className="grid grid-cols-7 gap-1">
        {/* Celdas vacías del offset */}
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Días del mes */}
        {dias.map((d) => {
          const fechaISO = format(d, "yyyy-MM-dd");
          return (
            <DayCard
              key={fechaISO}
              dia={d.getDate()}
              fechaISO={fechaISO}
              esHoy={isToday(d)}
              esMesActual={true}
              posteos={porFecha[fechaISO] ?? []}
              onNuevo={onNuevo}
              onEditar={onEditar}
            />
          );
        })}
      </div>
    </div>
  );
};
