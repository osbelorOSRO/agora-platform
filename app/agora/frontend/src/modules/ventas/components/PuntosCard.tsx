import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SaleMonthlyPoints } from "@/modules/accesos/types/salesRecord";
import { RANGO_LABELS } from "@/modules/accesos/types/salesRecord";
import { progressInfo } from "../utils";

interface Props {
  mesNombre: string;
  puntos: SaleMonthlyPoints | null;
  onPrev: () => void;
  onNext: () => void;
}

export const PuntosCard: React.FC<Props> = ({ mesNombre, puntos, onPrev, onNext }) => {
  const { percent, label } = progressInfo(puntos?.total_points ?? 0, puntos?.active_range ?? 1);

  return (
    <div className="rounded-2xl border border-border bg-muted p-5 space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onPrev}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-white transition"
          aria-label="Mes anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-lg font-bold text-white tracking-tight">{mesNombre}</h2>
        <button
          onClick={onNext}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-white transition"
          aria-label="Mes siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex items-end gap-3">
        <span className="text-4xl font-bold text-white tabular-nums">
          {puntos?.total_points ?? 0}
        </span>
        <span className="text-sm text-muted-foreground mb-1">puntos acumulados</span>
        <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-card border border-border text-primary">
          {RANGO_LABELS[puntos?.active_range ?? 1]}
        </span>
      </div>

      <div>
        <div className="w-full bg-card rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
};
