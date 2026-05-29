import { useEffect, useMemo, useState } from "react";
import {
  Bell, ContactRound, Megaphone, MessageSquare, Wrench,
} from "lucide-react";
import { getTokenData } from "@/utils/getTokenData";
import { obtenerActividadSemanalThreads } from "@/modules/accesos/services/reportesService";
import { listMetaInboxContacts, listMetaInboxThreads } from "@/services/metaInbox.service";
import { useNotificaciones } from "@/context/NotificacionContext";
import { buildWeeklyBuckets, getWeeklyWindow } from "../utils";
import type { ModuleCard } from "../types";

export function useWelcomeDashboard() {
  const features = getTokenData()?.features;
  const { unreadCount } = useNotificaciones();

  const [weeklyRows, setWeeklyRows] = useState<Awaited<ReturnType<typeof obtenerActividadSemanalThreads>>>([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const [chartError, setChartError] = useState("");
  const [agendaTotal, setAgendaTotal] = useState<number | null>(null);
  const [metaThreadsCount, setMetaThreadsCount] = useState<number | null>(null);

  const botStatus = features?.botControl ? "Control total" : features?.botView ? "Solo lectura" : "Sin acceso";

  const enabledModulesCount = [
    features?.conversations,
    features?.reports,
    features?.settings,
    features?.botView,
    features?.botControl,
    features?.scheduleControl,
  ].filter(Boolean).length;

  useEffect(() => {
    const load = async () => {
      try {
        const { desde, hasta } = getWeeklyWindow();
        setWeeklyRows(await obtenerActividadSemanalThreads(desde, hasta));
      } catch (e) {
        console.error("Error cargando actividad semanal:", e);
        setChartError("No se pudo cargar el grafico semanal de actividad.");
      } finally {
        setLoadingChart(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!features?.conversations) return;
    let cancelled = false;
    (async () => {
      try {
        const [agenda, metaThreads] = await Promise.all([
          listMetaInboxContacts({ limit: 1, offset: 0 }),
          listMetaInboxThreads(100, 0),
        ]);
        if (cancelled) return;
        setAgendaTotal(agenda?.total ?? 0);
        setMetaThreadsCount(
          Array.isArray(metaThreads)
            ? metaThreads.filter((t) => t.threadStatus === "OPEN").length
            : 0,
        );
      } catch (e) {
        if (!cancelled) console.error("Error cargando metricas del dashboard:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [features?.conversations]);

  const weeklyData = useMemo(() => buildWeeklyBuckets(weeklyRows), [weeklyRows]);
  const maxWeeklyTotal = useMemo(
    () => Math.max(...weeklyData.map((b) => b.total), 1),
    [weeklyData],
  );

  const moduleCards: ModuleCard[] = [
    {
      title: "Contacts",
      value: agendaTotal === null ? "--" : `${agendaTotal} ${agendaTotal === 1 ? "contacto" : "contactos"}`,
      subtitle: "Contactos conversacionales disponibles en agenda.",
      to: "/agenda",
      enabled: !!features?.conversations,
      Icon: ContactRound,
    },
    {
      title: "Threads",
      value: metaThreadsCount === null ? "--" : `${metaThreadsCount} ${metaThreadsCount === 1 ? "thread activo" : "threads activos"}`,
      subtitle: "Conversaciones operativas detectadas en Meta Inbox.",
      to: "/meta-inbox",
      enabled: !!features?.conversations,
      Icon: MessageSquare,
    },
    {
      title: "Ads WA",
      value: features?.conversations ? "Acceso habilitado" : "Sin acceso",
      subtitle: "Campañas y plantillas de mensajes de WhatsApp Ads.",
      to: features?.conversations ? "/meta-ads" : undefined,
      enabled: !!features?.conversations,
      Icon: Megaphone,
    },
    {
      title: "WA Backend",
      value: botStatus,
      subtitle: features?.botControl
        ? "Panel operativo conectado con acciones habilitadas."
        : features?.botView
          ? "Acceso informativo al bot en modo lectura."
          : "Sin acceso al módulo del bot.",
      to: features?.botView ? "/wa-control" : undefined,
      enabled: !!features?.botView,
      Icon: Wrench,
    },
    {
      title: "Notificaciones",
      value: `${unreadCount} ${unreadCount === 1 ? "no leída" : "no leídas"}`,
      subtitle: "Actividad reciente consolidada.",
      enabled: true,
      Icon: Bell,
    },
  ];

  const permisosRows: [string, boolean][] = [
    ["Contacts / Threads / Ads WA", !!features?.conversations],
    ["Reportes CSV",                 !!features?.reports],
    ["Ajustes y config.",            !!features?.settings],
    ["Vista bot WA",                 !!features?.botView],
    ["Control bot WA",               !!features?.botControl],
    ["Control agenda",               !!features?.scheduleControl],
    ...(features?.superadmin ? [["Stages / Offers / Integrations", true] as [string, boolean]] : []),
  ];

  return {
    enabledModulesCount, botStatus,
    scheduleControl: features?.scheduleControl ?? false,
    moduleCards, permisosRows,
    weeklyData, maxWeeklyTotal, loadingChart, chartError,
  };
}
