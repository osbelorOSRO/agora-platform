import React from "react";
import {
  startOfWeek,
  addDays,
  format,
  isToday,
  getDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { DayCard } from "./DayCard";
import type { Posteo } from "../types";

interface Props {
  fecha: Date; // cualquier día de la semana a mostrar
  posteos: Posteo[];
  onNuevo: (fecha: string) => void;
  onEditar: (posteo: Posteo) => void;
}

export const CalendarioSemana: React.FC<Props> = ({
  fecha,
  posteos,
  onNuevo,
  onEditar,
}) => {
  const lunes = startOfWeek(fecha, { weekStartsOn: 1 });
  const dias = Array.from({ length: 7 }, (_, i) => addDays(lunes, i));

  const porFecha = posteos.reduce<Record<string, Posteo[]>>((acc, p) => {
    const k = p.fecha.slice(0, 10);
    acc[k] = acc[k] ? [...acc[k], p] : [p];
    return acc;
  }, {});

  const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="w-full">
      <div className="mb-2 grid grid-cols-7 gap-1">
        {DIAS_SEMANA.map((d, i) => (
          <div
            key={d}
            className={`py-1 text-center text-[10px] font-bold uppercase tracking-wider ${
              isToday(dias[i]) ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
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
