import { Users } from "lucide-react";
import { getTokenData } from "@/utils/getTokenData";
import { useWelcomeDashboard } from "@/modules/welcome/hooks/useWelcomeDashboard";
import { WelcomeHeader } from "@/modules/welcome/components/WelcomeHeader";
import { ModuleCards } from "@/modules/welcome/components/ModuleCards";
import { SuperadminSection } from "@/modules/welcome/components/SuperadminSection";
import { WeeklyChart } from "@/modules/welcome/components/WeeklyChart";
import { NotificacionesPanel } from "@/modules/welcome/components/NotificacionesPanel";
import { PermisosPanel } from "@/modules/welcome/components/PermisosPanel";

export default function Welcome() {
  const tokenData = getTokenData();
  const {
    enabledModulesCount, botStatus, scheduleControl,
    moduleCards, permisosRows,
    weeklyData, maxWeeklyTotal, loadingChart, chartError,
  } = useWelcomeDashboard();

  return (
    <section className="space-y-4 md:space-y-8 text-foreground">
      <WelcomeHeader
        nombre={tokenData?.nombre}
        rol={tokenData?.rol}
        username={tokenData?.username}
        enabledModulesCount={enabledModulesCount}
        botStatus={botStatus}
        canManageAgenda={scheduleControl}
      />

      <ModuleCards cards={moduleCards} />

      {tokenData?.features?.superadmin && <SuperadminSection />}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.9fr)]">
        <div className="flex flex-col gap-6">
          <WeeklyChart
            weeklyData={weeklyData}
            maxTotal={maxWeeklyTotal}
            loading={loadingChart}
            error={chartError}
          />

          <section className="rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Lectura rápida</h2>
            </div>
            <div className="mt-5 space-y-4 text-sm text-muted-foreground">
              <p>Todos los perfiles autenticados entran por esta vista. Las acciones visibles cambian según el rol y los permisos incluidos en el token.</p>
              <p>El módulo de reportes queda dedicado a exportación CSV, mientras que el gráfico semanal vive solo aquí como pulso operativo resumido.</p>
              <p>Ajustes concentra usuarios y roles.</p>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <NotificacionesPanel />
          <PermisosPanel rows={permisosRows} />
        </aside>
      </div>
    </section>
  );
}
