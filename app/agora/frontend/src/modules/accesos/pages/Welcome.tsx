import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Lock,
  ContactRound,
  LayoutList,
  MessageSquare,
  Megaphone,
  PackageOpen,
  Plug,
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
import { useNotificaciones } from "@/context/NotificacionContext";
import { listMetaInboxContacts, listMetaInboxThreads } from "@/services/metaInbox.service";

function WaActivitySection() {
  const navigate = useNavigate();
  const { notificaciones, eliminar, eliminarTodas, markAllRead } = useNotificaciones();

  const activityFeed = useMemo(() => {
    const appMap = new Map<
      string,
      { actorExternalId: string; label: string; timestamp: string; latestContent: string; count: number }
    >();
    notificaciones.forEach((item) => {
      const prev = appMap.get(item.actorExternalId);
      const label = item.phone || item.actorExternalId;
      if (!prev) {
        appMap.set(item.actorExternalId, { actorExternalId: item.actorExternalId, label, timestamp: item.fecha, latestContent: item.contenido, count: 1 });
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

    return Array.from(appMap.values())
      .map((item) => ({
        id: `threads-${item.actorExternalId}-${item.timestamp}`,
        source: "THREADS",
        message: item.count > 1
          ? `${item.count} mensajes nuevos del actor ${item.label}`
          : `Nuevo mensaje del actor ${item.label}: ${item.latestContent}`,
        timestamp: item.timestamp,
        actorExternalId: item.actorExternalId,
        appCount: item.count,
      }))
      .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
      .slice(0, 8);
  }, [notificaciones]);

  const relativeActivityTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-2xl">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold text-foreground">Notificaciones</h2>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button type="button" onClick={markAllRead} className="rounded-lg border border-border bg-input px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-primary/30 hover:text-primary">Marcar como leídas</button>
        <button type="button" onClick={eliminarTodas} className="rounded-lg border border-border bg-input px-3 py-1.5 text-xs font-bold text-foreground transition hover:border-primary/30 hover:text-primary">Limpiar Threads</button>
      </div>

      <div className="mt-5 space-y-3">
        {activityFeed.length === 0 ? (
          <div className="rounded-xl border border-border bg-input p-4 text-sm text-muted-foreground">
            Aún no hay actividad reciente para mostrar.
          </div>
        ) : (
          activityFeed.map((item) => (
            <div key={item.id} className="group relative rounded-xl border border-border bg-input p-4">
              <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em]">
                <span className="font-bold text-primary">{item.source}</span>
                <span className="text-muted-foreground/60">{relativeActivityTime(item.timestamp)}</span>
              </div>
              <p className="mt-2 text-sm text-foreground">{item.message}</p>
              {item.actorExternalId ? (
                <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1 opacity-0 transition group-hover:opacity-100">
                  {item.appCount ? (
                    <span className="rounded-full bg-primary/20 px-2 py-1 text-[10px] font-bold text-primary">{item.appCount}</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => navigate(`/meta-inbox?actor=${encodeURIComponent(item.actorExternalId)}`)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-input text-foreground transition hover:bg-card"
                    title="Ir al thread"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => eliminar(item.actorExternalId)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-input text-muted-foreground transition hover:bg-rose-500/40 hover:text-foreground"
                    title="Eliminar notificación"
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
  );
}

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
  const { unreadCount } = useNotificaciones();
  const [weeklyRows, setWeeklyRows] = useState<ThreadWeeklyActivityRow[]>([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const [chartError, setChartError] = useState("");
  const [agendaTotal, setAgendaTotal] = useState<number | null>(null);
  const [metaThreadsCount, setMetaThreadsCount] = useState<number | null>(null);

  const isSuperadmin = user?.rol === "superadmin";
  const canUseThreads = hasPermission("gestionar_usuarios", permissions);
  const canSeeReports = hasPermission("ver_reportes", permissions);
  const canEditSettings = hasPermission("editar_configuracion", permissions);
  const canViewBot = hasPermission("vista_bot", permissions);
  const canManageBot = hasPermission("control_bot", permissions);
  const canManageAgenda = hasPermission("control_agenda", permissions);

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
    canManageBot,
    canManageAgenda,
  ].filter(Boolean).length;

  const botStatus = canManageBot
    ? "Control total"
    : canViewBot
      ? "Solo lectura"
      : "Sin acceso";

  const moduleCards: ModuleCard[] = [
    {
      title: "Contacts",
      value:
        agendaTotal === null
          ? "--"
          : `${agendaTotal} ${agendaTotal === 1 ? "contacto" : "contactos"}`,
      subtitle: "Contactos conversacionales disponibles en agenda.",
      to: "/agenda",
      enabled: canUseThreads,
      status: canUseThreads ? "Activo" : "Restringido",
      Icon: ContactRound,
    },
    {
      title: "Threads",
      value:
        metaThreadsCount === null
          ? "--"
          : `${metaThreadsCount} ${metaThreadsCount === 1 ? "thread activo" : "threads activos"}`,
      subtitle: "Conversaciones operativas detectadas en Meta Inbox.",
      to: "/meta-inbox",
      enabled: canUseThreads,
      status: canUseThreads ? "Activo" : "Restringido",
      Icon: MessageSquare,
    },
    {
      title: "Ads WA",
      value: canUseThreads ? "Acceso habilitado" : "Sin acceso",
      subtitle: "Campañas y plantillas de mensajes de WhatsApp Ads.",
      to: canUseThreads ? "/meta-ads" : undefined,
      enabled: canUseThreads,
      status: canUseThreads ? "Activo" : "Restringido",
      Icon: Megaphone,
    },
    {
      title: "WA Backend",
      value: botStatus,
      subtitle: canManageBot
        ? "Panel operativo conectado con acciones habilitadas."
        : canViewBot
          ? "Acceso informativo al bot en modo lectura."
          : "Sin acceso al módulo del bot.",
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
      status: "",
      Icon: Bell,
    },
  ];

  return (
    <section className="space-y-4 md:space-y-8 text-foreground">
      {/* ── Header ── */}
      <header className="rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">
              Agora Dashboard
            </p>
            <div>
              <h1 className="text-3xl font-black md:text-4xl text-foreground">
                Bienvenido{user?.nombre ? `, ${user.nombre}` : ""}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">
                Hub transversal de operación. Desde aquí centralizamos accesos, permisos
                y el pulso semanal de actividad conversacional.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-3 min-w-0">
            <div className="rounded-xl border border-border bg-input p-2 md:p-4 min-w-0 overflow-hidden">
              <div className="text-[9px] md:text-[10px] font-medium uppercase tracking-[0.18em] md:tracking-[0.22em] text-muted-foreground truncate">Perfil</div>
              <div className="mt-1 md:mt-2 text-sm md:text-xl font-bold capitalize text-foreground truncate">{user?.rol ?? "sin rol"}</div>
              <div className="mt-0.5 md:mt-1 text-[10px] md:text-sm text-muted-foreground truncate">{user?.username ?? "usuario"}</div>
            </div>
            <div className="rounded-xl border border-border bg-input p-2 md:p-4 min-w-0 overflow-hidden">
              <div className="text-[9px] md:text-[10px] font-medium uppercase tracking-[0.18em] md:tracking-[0.22em] text-muted-foreground truncate">Módulos</div>
              <div className="mt-1 md:mt-2 text-sm md:text-xl font-bold text-foreground">{enabledModulesCount}</div>
              <div className="mt-0.5 md:mt-1 text-[10px] md:text-sm text-muted-foreground">Activos</div>
            </div>
            <div className="rounded-xl border border-border bg-input p-2 md:p-4 min-w-0 overflow-hidden">
              <div className="text-[9px] md:text-[10px] font-medium uppercase tracking-[0.18em] md:tracking-[0.22em] text-muted-foreground truncate">Bot WA</div>
              <div className="mt-1 md:mt-2 text-sm md:text-xl font-bold text-foreground truncate">{botStatus}</div>
              <div className="mt-0.5 md:mt-1 text-[10px] md:text-sm text-muted-foreground truncate">{canManageAgenda ? "Editable" : "Sin control"}</div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Module cards ── */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-5">
        {moduleCards.map(({ title, value, subtitle, to, actionLabel, onAction, enabled, status, Icon }) => (
          <article
            key={title}
            className={`rounded-xl border p-3 md:p-5 min-w-0 overflow-hidden ${
              enabled ? "border-border bg-card shadow-xl" : "border-muted bg-background"
            }`}
          >
            <div className="rounded-xl bg-input p-2 md:p-3 w-fit">
              <Icon className="h-4 w-4 md:h-6 md:w-6 text-foreground" />
            </div>

            <h2 className="mt-2 md:mt-4 text-sm md:text-xl font-bold text-foreground truncate">{title}</h2>
            <p className="mt-1 md:mt-3 text-sm md:text-2xl font-black leading-tight text-foreground break-words">{value}</p>
            <p className="mt-1 md:mt-2 hidden md:block text-sm text-muted-foreground">{subtitle}</p>

            {to && enabled ? (
              <button
                type="button"
                onClick={() => navigate(to)}
                className="mt-3 md:mt-4 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-border bg-input px-2 md:px-4 py-2 text-xs md:text-sm font-bold text-foreground transition-colors hover:border-primary/30 hover:text-primary"
              >
                Ir al módulo
              </button>
            ) : null}

            {!to && enabled && onAction && actionLabel ? (
              <button
                type="button"
                onClick={onAction}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-input px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary/30 hover:text-primary"
              >
                {actionLabel}
              </button>
            ) : null}

            {!enabled ? (
              <div className="mt-3 md:mt-4 flex items-center gap-1 rounded-xl border border-border bg-input px-2 md:px-4 py-2 text-xs md:text-sm text-muted-foreground">
                <Lock className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
                <span className="truncate">Sin permiso</span>
              </div>
            ) : null}

          </article>
        ))}
      </div>

      {/* ── Módulos superadmin ── */}
      {isSuperadmin && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary">Superadmin</p>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Stage Templates",
                subtitle: "Configuración de flujos y etapas de conversación del bot.",
                to: "/stage-templates",
                Icon: LayoutList,
              },
              {
                title: "Offers",
                subtitle: "Catálogo de ofertas y planes disponibles en el motor.",
                to: "/offers",
                Icon: PackageOpen,
              },
              {
                title: "Integrations",
                subtitle: "Tokens, webhooks y accesos de la app Meta / Facebook.",
                to: "/integraciones",
                Icon: Plug,
              },
            ].map(({ title, subtitle, to, Icon }) => (
              <article key={title} className="rounded-xl border border-primary/20 bg-[#0A011B] p-5 transition hover:border-primary/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-xl bg-[#1E0122] p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="rounded-full bg-[#280125] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                    Superadmin
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-bold text-foreground">{title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
                <Link
                  to={to}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/20"
                >
                  Ir al módulo
                </Link>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* ── Chart + sidebar ── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,0.9fr)]">
        <div className="flex flex-col gap-6">
        <section className="rounded-xl border border-border bg-card p-6 shadow-2xl">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">Actividad semanal</p>
              <h2 className="mt-2 text-2xl font-bold text-foreground">Eventos registrados por semana</h2>
              <p className="mt-2 text-sm text-muted-foreground">Ventana móvil de ocho semanas, agrupada de lunes a domingo.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-input px-4 py-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              {weeklyData[0] ? formatDateLabel(weeklyData[0].weekStart) : "--"} a{" "}
              {weeklyData[weeklyData.length - 1] ? formatDateLabel(weeklyData[weeklyData.length - 1].weekEnd) : "--"}
            </div>
          </div>

          {loadingChart ? (
            <div className="mt-8 rounded-xl border border-border bg-input p-6 text-sm text-muted-foreground">
              Cargando gráfico semanal...
            </div>
          ) : null}

          {chartError ? (
            <div className="mt-8 rounded-xl border border-rose-400/25 bg-rose-500/10 p-6 text-sm text-rose-300">{chartError}</div>
          ) : null}

          {!loadingChart && !chartError ? (
            <div className="mt-8">
              <div className="flex h-44 md:h-72 items-end gap-1.5 md:gap-3 overflow-x-auto rounded-xl border border-border bg-input p-3 md:p-5">
                {weeklyData.map((item) => {
                  const height = `${Math.max((item.total / maxWeeklyTotal) * 100, item.total > 0 ? 12 : 4)}%`;
                  return (
                    <div key={item.weekStart} className="flex h-full min-w-[52px] md:min-w-[88px] flex-1 flex-col items-center justify-end gap-1.5 md:gap-3">
                      <div className="text-xs md:text-sm font-bold text-foreground">{item.total}</div>
                      <div className="flex h-28 md:h-44 w-full items-end rounded-xl bg-muted px-1">
                        <div
                          className="w-full rounded-t-xl bg-gradient-to-t from-primary via-primary/50 to-primary/20 md:shadow-[0_10px_30px_var(--primary-glow)] transition-[height]"
                          style={{ height }}
                          title={`${item.total} eventos`}
                        />
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
          ) : null}
        </section>

          {/* Lectura rápida */}
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
          <WaActivitySection />

          {/* Permisos */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Estado de permisos</h2>
            </div>
            <div className="mt-5 space-y-3">
              {([
                ["Contacts / Threads / Ads WA", canUseThreads],
                ["Reportes CSV", canSeeReports],
                ["Ajustes y config.", canEditSettings],
                ["Vista bot WA", canViewBot],
                ["Control bot WA", canManageBot],
                ["Control agenda", canManageAgenda],
                ...(isSuperadmin ? [["Stages / Offers / Integrations", true]] : []),
              ] as [string, boolean][]).map(([label, active]) => (
                <div key={String(label)} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-input px-3 md:px-4 py-2 md:py-3">
                  <span className="min-w-0 flex-1 text-xs md:text-sm text-foreground">{label}</span>
                  <span className={`shrink-0 rounded-full px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] ${active ? "bg-[#3F203E] text-primary" : "bg-card text-muted-foreground"}`}>
                    {active ? "Activo" : "No"}
                  </span>
                </div>
              ))}
            </div>
          </section>

        </aside>
      </div>
    </section>
  );
}
