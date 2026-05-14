import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Lock,
  ContactRound,
  MessageSquare,
  ArrowUpRight,
  X,
  Shield,
  Users,
  Wrench,
} from "lucide-react";
import { getTokenData } from "@/utils/getTokenData";
import { hasPermission } from "@/utils/permissions";
import {
  obtenerActividadSemanalThreads,
  type ThreadWeeklyActivityRow,
} from "../services/reportesService";
import { useWaDashboard } from "@/modules/wa/hooks/useWaDashboard";
import { useNotificaciones } from "@/context/NotificacionContext";
import { listMetaInboxContacts, listMetaInboxThreads } from "@/services/metaInbox.service";

type WeeklyBucket = {
  weekStart: string;
  weekEnd: string;
  total: number;
};

type ModuleCard = {
  title: string;
  value: string;
  subtitle: string;
  to?: string;
  actionLabel?: string;
  onAction?: () => void;
  enabled: boolean;
  status: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const formatDateLabel = (value: string) =>
  new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${value}T12:00:00`));

const relativeActivityTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfWeek = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
};

const buildEmptyWeeklyBuckets = (totalWeeks = 8): WeeklyBucket[] => {
  const thisWeekStart = startOfWeek(new Date());
  const firstWeekStart = new Date(thisWeekStart);
  firstWeekStart.setDate(firstWeekStart.getDate() - (totalWeeks - 1) * 7);

  const buckets = new Map<string, WeeklyBucket>();

  for (let index = 0; index < totalWeeks; index += 1) {
    const weekStart = new Date(firstWeekStart);
    weekStart.setDate(firstWeekStart.getDate() + index * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekStartKey = toLocalDateKey(weekStart);
    buckets.set(weekStartKey, {
      weekStart: weekStartKey,
      weekEnd: toLocalDateKey(weekEnd),
      total: 0,
    });
  }

  return Array.from(buckets.values());
};

const buildWeeklyBuckets = (
  activityRows: ThreadWeeklyActivityRow[],
  totalWeeks = 8
): WeeklyBucket[] => {
  const buckets = new Map(buildEmptyWeeklyBuckets(totalWeeks).map((item) => [item.weekStart, item]));

  activityRows.forEach((row) => {
    const fecha = new Date(`${row.semana_inicio}T12:00:00`);
    if (Number.isNaN(fecha.getTime())) return;
    const weekStartKey = toLocalDateKey(fecha);
    const current = buckets.get(weekStartKey);
    if (!current) return;

    current.total = Number(row.total_eventos || 0);
  });

  return Array.from(buckets.values());
};

const getWeeklyWindow = (totalWeeks = 8) => {
  const buckets = buildEmptyWeeklyBuckets(totalWeeks);
  const desde = new Date(`${buckets[0].weekStart}T00:00:00`);
  const hasta = new Date(`${buckets[buckets.length - 1].weekEnd}T23:59:59`);
  return {
    desde: desde.toISOString(),
    hasta: hasta.toISOString(),
  };
};

export default function Welcome() {
  const user = getTokenData();
  const navigate = useNavigate();
  const permissions = user?.permisos ?? [];
  const { notificaciones, eliminar, eliminarTodas, unreadCount, markAllRead } = useNotificaciones();
  const [weeklyRows, setWeeklyRows] = useState<ThreadWeeklyActivityRow[]>([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const [chartError, setChartError] = useState("");
  const [agendaTotal, setAgendaTotal] = useState<number | null>(null);
  const [metaThreadsCount, setMetaThreadsCount] = useState<number | null>(null);

  const canUseThreads = hasPermission("gestionar_usuarios", permissions);
  const canSeeReports = hasPermission("ver_reportes", permissions);
  const canEditSettings = hasPermission("editar_configuracion", permissions);
  const canViewBot = hasPermission("vista_bot", permissions);
  const canManageBot = hasPermission("control_bot", permissions);
  const canManageAgenda = hasPermission("control_agenda", permissions);
  const {
    qrStatus,
    logs: waLogs,
    generarQr,
    reiniciar,
    cerrarSesion,
  } = useWaDashboard();

  useEffect(() => {
    const load = async () => {
      try {
        const { desde, hasta } = getWeeklyWindow();
        const data = await obtenerActividadSemanalThreads(desde, hasta);
        setWeeklyRows(data);
      } catch (error) {
        console.error("Error cargando actividad semanal:", error);
        setChartError("No se pudo cargar el grafico semanal de actividad.");
      } finally {
        setLoadingChart(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!canUseThreads) return;

    let cancelled = false;

    (async () => {
      try {
        const [agenda, metaThreads] = await Promise.all([
          listMetaInboxContacts({ limit: 1, offset: 0 }),
          listMetaInboxThreads(100, 0),
        ]);

        if (cancelled) return;
        setAgendaTotal(agenda?.total ?? 0);
        setMetaThreadsCount(Array.isArray(metaThreads) ? metaThreads.length : 0);
      } catch (error) {
        if (cancelled) return;
        console.error("Error cargando metricas del dashboard:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canUseThreads]);

  const weeklyData = useMemo(() => buildWeeklyBuckets(weeklyRows), [weeklyRows]);
  const maxWeeklyTotal = useMemo(
    () => Math.max(...weeklyData.map((item) => item.total), 1),
    [weeklyData]
  );

  const enabledModulesCount = [
    canUseThreads,
    canSeeReports,
    canEditSettings,
    canViewBot,
  ].filter(Boolean).length;

  const botStatus = canManageBot
    ? "Control total"
    : canViewBot
      ? "Solo lectura"
      : "Sin acceso";

  const activityFeed = useMemo(() => {
    const waEntries = waLogs.map((item) => ({
      id: `wa-${item.id}`,
      source: "WA",
      message: item.message,
      timestamp: item.timestamp,
      tone: item.type,
      actorExternalId: "",
      appCount: 0,
    }));

    const appMap = new Map<
      string,
      { actorExternalId: string; label: string; timestamp: string; latestContent: string; count: number }
    >();
    notificaciones.forEach((item) => {
      const prev = appMap.get(item.actorExternalId);
      const label = item.phone || item.actorExternalId;
      if (!prev) {
        appMap.set(item.actorExternalId, {
          actorExternalId: item.actorExternalId,
          label,
          timestamp: item.fecha,
          latestContent: item.contenido,
          count: 1,
        });
        return;
      }

      const prevTs = +new Date(prev.timestamp);
      const nextTs = +new Date(item.fecha);
      appMap.set(item.actorExternalId, {
        actorExternalId: item.actorExternalId,
        label: prev.label || label,
        timestamp: nextTs > prevTs ? item.fecha : prev.timestamp,
        latestContent: nextTs > prevTs ? item.contenido : prev.latestContent,
        count: prev.count + 1,
      });
    });

    const appEntries = Array.from(appMap.values()).map((item) => ({
      id: `threads-${item.actorExternalId}-${item.timestamp}`,
      source: "THREADS",
      message:
        item.count > 1
          ? `${item.count} mensajes nuevos del actor ${item.label}`
          : `Nuevo mensaje del actor ${item.label}: ${item.latestContent}`,
      timestamp: item.timestamp,
      tone: "info" as const,
      actorExternalId: item.actorExternalId,
      appCount: item.count,
    }));

    return [...waEntries, ...appEntries]
      .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
      .slice(0, 8);
  }, [notificaciones, waLogs]);

  const moduleCards: ModuleCard[] = [
    {
      title: "Agenda",
      value:
        agendaTotal === null
          ? "--"
          : `${agendaTotal} ${agendaTotal === 1 ? "contacto" : "contactos"}`,
      subtitle: "Contactos conversacionales disponibles en agenda.",
      to: "/agenda",
      enabled: canUseThreads,
      status: canUseThreads ? "Disponible" : "Restringido",
      Icon: ContactRound,
    },
    {
      title: "Threads",
      value:
        metaThreadsCount === null
          ? "--"
          : `${metaThreadsCount} ${metaThreadsCount === 1 ? "thread activo" : "threads activos"}`,
      subtitle: "Conversaciones operativas detectadas en Threads.",
      to: "/meta-inbox",
      enabled: canUseThreads,
      status: canUseThreads ? "Disponible" : "Restringido",
      Icon: MessageSquare,
    },
    {
      title: "WA Backend",
      value: botStatus,
      subtitle: canManageBot
        ? "Panel operativo conectado con acciones habilitadas."
        : canViewBot
          ? "Acceso informativo al bot en modo lectura."
          : "Sin acceso al modulo del bot.",
      to: canViewBot ? "/wa-control" : undefined,
      enabled: canViewBot,
      status: botStatus,
      Icon: Wrench,
    },
    {
      title: "Notificaciones",
      value: `${unreadCount} ${unreadCount === 1 ? "no leída" : "no leídas"}`,
      subtitle: "Actividad reciente consolidada.",
      enabled: true,
      status: activityFeed.length > 0 ? "Activo" : "Sin eventos",
      Icon: Bell,
    },
  ];

  return (
    <section className="space-y-8 text-white">
      <header className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/80">
              Agora Dashboard
            </p>
            <div>
              <h1 className="text-3xl font-bold md:text-4xl">
                Bienvenido{user?.nombre ? `, ${user.nombre}` : ""}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-white/75 md:text-base">
                Este es el hub transversal de operacion. Desde aqui centralizamos
                accesos, permisos y el pulso semanal de actividad conversacional.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-white/55">
                Perfil
              </div>
              <div className="mt-2 text-xl font-semibold capitalize">
                {user?.rol ?? "sin rol"}
              </div>
              <div className="mt-1 text-sm text-white/60">{user?.username ?? "usuario"}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-white/55">
                Modulos activos
              </div>
              <div className="mt-2 text-xl font-semibold">{enabledModulesCount}</div>
              <div className="mt-1 text-sm text-white/60">
                Segun permisos vigentes
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-white/55">
                Bot WhatsApp
              </div>
              <div className="mt-2 text-xl font-semibold">{botStatus}</div>
              <div className="mt-1 text-sm text-white/60">
                Agenda {canManageAgenda ? "editable" : "sin control"}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {moduleCards.map(({ title, value, subtitle, to, actionLabel, onAction, enabled, status, Icon }) => (
          <article
            key={title}
            className={`rounded-[24px] border p-5 transition ${
              enabled
                ? "border-white/15 bg-white/8 shadow-xl"
                : "border-white/8 bg-black/15 opacity-80"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="rounded-2xl bg-white/10 p-3">
                <Icon className="h-6 w-6" />
              </div>
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                  enabled ? "bg-emerald-400/15 text-emerald-100" : "bg-white/10 text-white/55"
                }`}
              >
                {status}
              </span>
            </div>

            <h2 className="mt-4 text-xl font-semibold">{title}</h2>
            <p className="mt-3 text-2xl font-black leading-tight text-white">{value}</p>
            <p className="mt-2 min-h-16 text-sm text-white/70">{subtitle}</p>

            {to && enabled ? (
              <Link
                to={to}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/15"
              >
                Ir al modulo
              </Link>
            ) : null}

            {!to && enabled && onAction && actionLabel ? (
              <button
                type="button"
                onClick={onAction}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/15"
              >
                {actionLabel}
              </button>
            ) : null}

            {!enabled ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/55">
                <Lock className="h-4 w-4" />
                Sin permiso para operar
              </div>
            ) : null}

            {title === "WA Control" && canManageBot ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={generarQr}
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium transition hover:bg-white/15"
                >
                  Generar QR
                </button>
                <button
                  type="button"
                  onClick={reiniciar}
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium transition hover:bg-white/15"
                >
                  Reiniciar
                </button>
                <button
                  type="button"
                  onClick={cerrarSesion}
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium transition hover:bg-white/15"
                >
                  Logout
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.9fr)]">
        <section className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/80">
                Actividad semanal
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Eventos registrados por semana
              </h2>
              <p className="mt-2 text-sm text-white/70">
                Ventana movil de ocho semanas, agrupada de lunes a domingo.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/65">
              <BarChart3 className="h-4 w-4" />
              {weeklyData[0] ? formatDateLabel(weeklyData[0].weekStart) : "--"} a{" "}
              {weeklyData[weeklyData.length - 1]
                ? formatDateLabel(weeklyData[weeklyData.length - 1].weekEnd)
                : "--"}
            </div>
          </div>

          {loadingChart ? (
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
              Cargando grafico semanal...
            </div>
          ) : null}

          {chartError ? (
            <div className="mt-8 rounded-2xl border border-red-400/25 bg-red-500/10 p-6 text-sm text-red-100">
              {chartError}
            </div>
          ) : null}

          {!loadingChart && !chartError ? (
            <div className="mt-8">
              <div className="flex h-72 items-end gap-3 overflow-x-auto rounded-[24px] border border-white/10 bg-white/5 p-5">
                {weeklyData.map((item) => {
                  const height = `${Math.max((item.total / maxWeeklyTotal) * 100, item.total > 0 ? 12 : 4)}%`;
                  return (
                    <div
                      key={item.weekStart}
                      className="flex h-full min-w-[88px] flex-1 flex-col items-center justify-end gap-3"
                    >
                      <div className="text-sm font-semibold text-white/90">{item.total}</div>
                      <div className="flex h-44 w-full items-end rounded-[18px] bg-white/[0.03] px-1">
                        <div
                          className="w-full rounded-t-[18px] bg-gradient-to-t from-cyan-400 via-sky-400 to-orange-300 shadow-[0_10px_30px_rgba(56,189,248,0.35)] transition-all"
                          style={{ height }}
                          title={`${item.total} eventos`}
                        />
                      </div>
                      <div className="text-center text-xs text-white/65">
                        <div>{formatDateLabel(item.weekStart)}</div>
                        <div>{formatDateLabel(item.weekEnd)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-cyan-200" />
              <h2 className="text-xl font-semibold">Notificaciones</h2>
            </div>

            {qrStatus ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
                {qrStatus.message}
              </div>
            ) : null}

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={markAllRead}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/15"
              >
                Marcar como leídas
              </button>
              <button
                type="button"
                onClick={eliminarTodas}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/15"
              >
                Limpiar Threads
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {activityFeed.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/10 p-4 text-sm text-white/60">
                  Aun no hay actividad reciente para mostrar.
                </div>
              ) : (
                activityFeed.map((item) => (
                  <div
                    key={item.id}
                    className="group relative rounded-xl border border-white/10 bg-black/10 p-4"
                  >
                    <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em]">
                      <span
                        className={`font-semibold ${
                          item.tone === "success"
                            ? "text-emerald-200"
                            : item.tone === "error"
                              ? "text-red-200"
                              : item.tone === "warning"
                                ? "text-amber-200"
                                : "text-cyan-200"
                        }`}
                      >
                        {item.source}
                      </span>
                      <span className="text-white/35">{relativeActivityTime(item.timestamp)}</span>
                    </div>
                    <p className="mt-2 text-sm text-white/80">{item.message}</p>
                    {item.source === "THREADS" && item.actorExternalId ? (
                      <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-2 py-1 opacity-0 transition group-hover:opacity-100">
                        {item.appCount ? (
                          <span className="rounded-full bg-cyan-300/20 px-2 py-1 text-[10px] font-semibold text-cyan-100">
                            {item.appCount}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => navigate(`/meta-inbox?actor=${encodeURIComponent(item.actorExternalId)}`)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/90 transition hover:bg-white/20"
                          title="Ir al thread"
                          aria-label="Ir al thread"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminar(item.actorExternalId)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-red-500/40 hover:text-white"
                          title="Eliminar notificación"
                          aria-label="Eliminar notificación"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-cyan-200" />
              <h2 className="text-xl font-semibold">Estado de permisos</h2>
            </div>

            <div className="mt-5 space-y-3">
              {[
                ["Operacion Threads", canUseThreads],
                ["Reportes CSV", canSeeReports],
                ["Ajustes y configuracion", canEditSettings],
                ["Vista bot", canViewBot],
                ["Control bot", canManageBot],
                ["Control agenda", canManageAgenda],
              ].map(([label, active]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <span className="text-sm text-white/80">{label}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                      active ? "bg-emerald-400/15 text-emerald-100" : "bg-white/10 text-white/55"
                    }`}
                  >
                    {active ? "Activo" : "No"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-orange-200" />
              <h2 className="text-xl font-semibold">Lectura rapida</h2>
            </div>

            <div className="mt-5 space-y-4 text-sm text-white/75">
              <p>
                Todos los perfiles autenticados entran por esta vista. Las acciones
                visibles y operables cambian segun el rol y los permisos incluidos en el token.
              </p>
              <p>
                El modulo de reportes queda dedicado a exportacion CSV, mientras que el
                grafico semanal vive solo aqui como pulso operativo resumido.
              </p>
              <p>
                Ajustes concentra usuarios y roles. Oficinas queda fuera de esta nueva
                navegacion principal.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
