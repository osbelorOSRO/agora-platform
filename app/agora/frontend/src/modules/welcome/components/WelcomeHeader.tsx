import React from "react";

interface Props {
  nombre?: string;
  rol?: string;
  agendaTotal: number | null;
  metaThreadsCount: number | null;
}

export const WelcomeHeader: React.FC<Props> = ({ nombre, rol, agendaTotal, metaThreadsCount }) => (
  <div className="flex items-center justify-between gap-6">
    <div>
      <h1 className="text-3xl font-bold text-foreground">
        Bienvenido{nombre ? `, ${nombre}` : ""}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{rol ?? "sin rol"}</p>
    </div>

    <div className="hidden md:flex items-center gap-8 shrink-0">
      <div className="text-right">
        <div className="text-2xl font-bold text-foreground">
          {agendaTotal === null ? "--" : agendaTotal}
        </div>
        <div className="text-xs text-muted-foreground">contacts</div>
      </div>
      <div className="w-px h-8 bg-border" />
      <div className="text-right">
        <div className="text-2xl font-bold text-foreground">
          {metaThreadsCount === null ? "--" : metaThreadsCount}
        </div>
        <div className="text-xs text-muted-foreground">threads activos</div>
      </div>
    </div>
  </div>
);
