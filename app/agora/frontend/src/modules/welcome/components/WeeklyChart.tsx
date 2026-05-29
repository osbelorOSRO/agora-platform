import React from "react";
import { BarChart3 } from "lucide-react";
import type { WeeklyBucket } from "../types";
import { formatDateLabel } from "../utils";

interface Props {
  weeklyData: WeeklyBucket[];
  maxTotal: number;
  loading: boolean;
  error: string;
}

export const WeeklyChart: React.FC<Props> = ({ weeklyData, maxTotal, loading, error }) => (
  <section className="rounded-xl border border-border bg-card p-6 shadow-2xl">
    <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">Actividad semanal</p>
        <h2 className="mt-2 text-2xl font-bold text-foreground">Threads únicos por semana</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sessions únicas (sin duplicados por origen) en ventana móvil de ocho semanas.</p>
      </div>
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-input px-4 py-2 text-sm text-muted-foreground">
        <BarChart3 className="h-4 w-4" />
        {weeklyData[0] ? formatDateLabel(weeklyData[0].weekStart) : "--"} a{" "}
        {weeklyData[weeklyData.length - 1] ? formatDateLabel(weeklyData[weeklyData.length - 1].weekEnd) : "--"}
      </div>
    </div>

    {loading && (
      <div className="mt-8 rounded-xl border border-border bg-input p-6 text-sm text-muted-foreground">
        Cargando gráfico semanal...
      </div>
    )}
    {error && !loading && (
      <div className="mt-8 rounded-xl border border-rose-400/25 bg-rose-500/10 p-6 text-sm text-rose-300">{error}</div>
    )}
    {!loading && !error && (
      <div className="mt-8">
        <div className="flex h-44 md:h-72 items-end gap-1.5 md:gap-3 overflow-x-auto rounded-xl border border-border bg-input p-3 md:p-5">
          {weeklyData.map((item) => {
            const height = `${Math.max((item.total / maxTotal) * 100, item.total > 0 ? 12 : 4)}%`;
            return (
              <div key={item.weekStart} className="flex h-full min-w-[52px] md:min-w-[88px] flex-1 flex-col items-center justify-end gap-1.5 md:gap-3">
                <div className="text-xs md:text-sm font-bold text-foreground">{item.total}</div>
                <div className="flex h-28 md:h-44 w-full items-end rounded-xl bg-muted px-1">
                  <div className="w-full rounded-t-xl bg-primary transition-[height]" style={{ height }} title={`${item.total} threads únicos`} />
                </div>
                <div className="text-center text-[10px] md:text-xs text-muted-foreground">
                  <div>{formatDateLabel(item.weekStart)}</div>
                  <div className="hidden md:block">{formatDateLabel(item.weekEnd)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}
  </section>
);
