import React, { useMemo } from "react";
import { ArrowUpRight, Bell, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotificaciones } from "@/context/NotificacionContext";

const relativeActivityTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(date);
};

export const NotificacionesPanel: React.FC = () => {
  const navigate = useNavigate();
  const { notificaciones, eliminar, eliminarTodas, markAllRead, lastReadAt } = useNotificaciones();

  const activityFeed = useMemo(() => {
    const map = new Map<string, {
      actorExternalId: string; label: string; timestamp: string;
      latestContent: string; totalCount: number; unreadCount: number;
    }>();

    notificaciones.forEach((item) => {
      const prev = map.get(item.actorExternalId);
      const label = item.phone || item.actorExternalId;
      const isUnread = +new Date(item.fecha) > lastReadAt;
      if (!prev) {
        map.set(item.actorExternalId, { actorExternalId: item.actorExternalId, label, timestamp: item.fecha, latestContent: item.contenido, totalCount: 1, unreadCount: isUnread ? 1 : 0 });
        return;
      }
      const prevTs = +new Date(prev.timestamp);
      const nextTs = +new Date(item.fecha);
      map.set(item.actorExternalId, {
        actorExternalId: item.actorExternalId,
        label: prev.label || label,
        timestamp: nextTs > prevTs ? item.fecha : prev.timestamp,
        latestContent: nextTs > prevTs ? item.contenido : prev.latestContent,
        totalCount: prev.totalCount + 1,
        unreadCount: prev.unreadCount + (isUnread ? 1 : 0),
      });
    });

    return Array.from(map.values())
      .map((item) => ({
        id: `threads-${item.actorExternalId}-${item.timestamp}`,
        message: item.unreadCount > 1
          ? `${item.unreadCount} mensajes nuevos de ${item.label}`
          : item.unreadCount === 1
            ? `Nuevo mensaje de ${item.label}: ${item.latestContent}`
            : `${item.totalCount} mensajes de ${item.label}`,
        timestamp: item.timestamp,
        actorExternalId: item.actorExternalId,
        unreadCount: item.unreadCount,
      }))
      .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
      .slice(0, 8);
  }, [notificaciones, lastReadAt]);

  const allRead = notificaciones.every((n) => +new Date(n.fecha) <= lastReadAt);

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-2xl">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-bold text-foreground">Notificaciones</h2>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={markAllRead}
          disabled={allRead}
          className="rounded-lg border border-border bg-input px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Marcar como leídas
        </button>
        <button
          type="button"
          onClick={eliminarTodas}
          className="rounded-lg border border-border bg-input px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-secondary"
        >
          Limpiar Threads
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {activityFeed.length === 0 ? (
          <div className="rounded-xl border border-border bg-input p-4 text-sm text-muted-foreground">
            Aún no hay actividad reciente para mostrar.
          </div>
        ) : (
          activityFeed.map((item) => {
            const isUnread = +new Date(item.timestamp) > lastReadAt;
            return (
              <div key={item.id} className={`group relative rounded-xl border bg-input p-4 ${isUnread ? "border-border-primary" : "border-border"}`}>
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <div className="flex items-center gap-2">
                    {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    <span className="font-medium text-muted-foreground">Threads</span>
                  </div>
                  <span className="text-muted-foreground">{relativeActivityTime(item.timestamp)}</span>
                </div>
                <p className="mt-2 text-sm text-foreground">{item.message}</p>
                {item.actorExternalId && (
                  <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1 opacity-0 transition group-hover:opacity-100">
                    {item.unreadCount > 0 && (
                      <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">{item.unreadCount}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/meta-inbox?actor=${encodeURIComponent(item.actorExternalId)}`)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-input text-foreground transition hover:bg-card"
                      title="Ir al thread"
                      aria-label="Ir al thread"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminar(item.actorExternalId)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-input text-muted-foreground transition hover:bg-rose-500/40 hover:text-foreground"
                      title="Eliminar notificación"
                      aria-label="Eliminar notificación"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
