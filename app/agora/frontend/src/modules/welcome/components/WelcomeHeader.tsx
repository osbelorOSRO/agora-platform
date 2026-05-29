import React from "react";

interface Props {
  nombre?: string;
  rol?: string;
  username?: string;
  enabledModulesCount: number;
  botStatus: string;
  canManageAgenda: boolean;
}

export const WelcomeHeader: React.FC<Props> = ({
  nombre, rol, username, enabledModulesCount, botStatus, canManageAgenda,
}) => (
  <header className="rounded-xl border border-border bg-card p-6 shadow-2xl">
    <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
      <div className="space-y-3">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">Agora Dashboard</p>
        <div>
          <h1 className="text-3xl font-black md:text-4xl text-foreground">
            Bienvenido{nombre ? `, ${nombre}` : ""}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">
            Hub transversal de operación. Desde aquí centralizamos accesos, permisos y el pulso semanal de actividad conversacional.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-3 min-w-0">
        {[
          { label: "Perfil", value: rol ?? "sin rol", sub: username ?? "usuario" },
          { label: "Módulos", value: String(enabledModulesCount), sub: "Activos" },
          { label: "Bot WA", value: botStatus, sub: canManageAgenda ? "Editable" : "Sin control" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-xl border border-border bg-input p-2 md:p-4 min-w-0 overflow-hidden">
            <div className="text-[9px] md:text-[10px] font-medium uppercase tracking-[0.18em] md:tracking-[0.22em] text-muted-foreground truncate">{label}</div>
            <div className="mt-1 md:mt-2 text-sm md:text-xl font-bold capitalize text-foreground truncate">{value}</div>
            <div className="mt-0.5 md:mt-1 text-[10px] md:text-sm text-muted-foreground truncate">{sub}</div>
          </div>
        ))}
      </div>
    </div>
  </header>
);
