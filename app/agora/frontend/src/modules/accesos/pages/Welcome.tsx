import { getTokenData } from "@/utils/getTokenData";
import { useWelcomeDashboard } from "@/modules/welcome/hooks/useWelcomeDashboard";
import { WelcomeHeader } from "@/modules/welcome/components/WelcomeHeader";
import { WeeklyChart } from "@/modules/welcome/components/WeeklyChart";
import { NotificacionesPanel } from "@/modules/welcome/components/NotificacionesPanel";

export default function Welcome() {
  const tokenData = getTokenData();
  const {
    weeklyData, maxWeeklyTotal, loadingChart, chartError,
    agendaTotal, metaThreadsCount,
  } = useWelcomeDashboard();

  return (
    <section className="space-y-6 text-foreground">
      <WelcomeHeader
        nombre={tokenData?.nombre}
        rol={tokenData?.rol}
        agendaTotal={agendaTotal}
        metaThreadsCount={metaThreadsCount}
      />

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-[minmax(320px,1fr)_minmax(0,2fr)]">
        <NotificacionesPanel />
        <WeeklyChart
          weeklyData={weeklyData}
          maxTotal={maxWeeklyTotal}
          loading={loadingChart}
          error={chartError}
        />
      </div>
    </section>
  );
}
