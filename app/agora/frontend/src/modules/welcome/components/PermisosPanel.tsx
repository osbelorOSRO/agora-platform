import React from "react";
import { Shield } from "lucide-react";

interface Props {
  rows: [string, boolean][];
}

export const PermisosPanel: React.FC<Props> = ({ rows }) => (
  <section className="rounded-xl border border-border bg-card p-6 shadow-2xl">
    <div className="flex items-center gap-3">
      <Shield className="h-5 w-5 text-primary" />
      <h2 className="text-xl font-bold text-foreground">Estado de permisos</h2>
    </div>
    <div className="mt-5 space-y-3">
      {rows.map(([label, active]) => (
        <div key={String(label)} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-input px-3 md:px-4 py-2 md:py-3">
          <span className="min-w-0 flex-1 text-xs md:text-sm text-foreground">{label}</span>
          <span className={`shrink-0 rounded-full px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] ${active ? "bg-[#3F203E] text-primary" : "bg-card text-muted-foreground"}`}>
            {active ? "Activo" : "No"}
          </span>
        </div>
      ))}
    </div>
  </section>
);
