import { createContext, useEffect, useMemo, useState, useContext } from "react";
import { Notificacion } from "../types/Notificacion";
import { connectSocket, getSocket } from "../services/socket";
import { getTokenData } from "../utils/getTokenData";
import { storage } from "../lib/storage";

const NotificacionContext = createContext<{
  notificaciones: Notificacion[];
  agregar: (n: Notificacion) => void;
  eliminar: (actorExternalId: string) => void;
  eliminarTodas: () => void;
  markAllRead: () => void;
  unreadCount: number;
  lastReadAt: number;
} | null>(null);

export const useNotificaciones = () => {
  const ctx = useContext(NotificacionContext);
  if (!ctx) throw new Error("useNotificaciones debe usarse dentro de NotificacionProvider");
  return ctx;
};

const NOTIFICATION_TTL_MS = 72 * 60 * 60 * 1000;

const toTimestamp = (value?: string) => {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
};

const cleanupNotifications = (items: Notificacion[]) => {
  const now = Date.now();
  return items
    .filter((item) => {
      if (!item.actorExternalId) return false;
      const ts = toTimestamp(item.fecha);
      if (!ts) return false;
      return now - ts <= NOTIFICATION_TTL_MS;
    })
    .slice(0, 100);
};

const loadStored = (): Notificacion[] => {
  try {
    const raw = storage.getNotifications();
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? cleanupNotifications(parsed as Notificacion[]) : [];
  } catch {
    return [];
  }
};

const loadReadCutoff = (): number => {
  try {
    const raw = storage.getNotificationsReadCutoff();
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
};

export const NotificacionProvider = ({ children }: { children: React.ReactNode }) => {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>(() => loadStored());
  const [lastReadAt, setLastReadAt] = useState<number>(() => loadReadCutoff());

const agregar = (nueva: Notificacion | Record<string, unknown>) => {
  const raw = nueva as Record<string, unknown>;
  const normalized: Notificacion = {
    actorExternalId: String(raw?.actorExternalId ?? "desconocido"),
    phone: raw?.phone ? String(raw.phone) : undefined,
    contenido: String(
      raw?.contenido ??
        raw?.contentText ??
        raw?.mensaje ??
        "Mensaje entrante"
    ),
    fecha: String(
      raw?.fecha ??
        raw?.fecha_envio ??
        raw?.timestamp ??
        new Date().toISOString()
    ),
  };

  console.log("📥 Llamando a agregar con:", normalized);
  setNotificaciones((prev) => {
    const next = cleanupNotifications([normalized, ...prev]);
    const deduped = next.filter(
      (item, idx, arr) =>
        idx ===
        arr.findIndex(
          (n) =>
            n.actorExternalId === item.actorExternalId &&
            n.contenido === item.contenido &&
            n.fecha === item.fecha
        )
    );
    return deduped.slice(0, 50);
  });
};

  useEffect(() => {
    let activeSocket: ReturnType<typeof getSocket> = null;

    const handleNuevoMensaje = (data: Notificacion) => {
      agregar(data);
      const audio = new Audio("/sound/notificacion.mp3");
      audio.play().catch(() => {});
    };

    const ensureSocket = () => {
      const tokenData = getTokenData();
      if (!tokenData) return;

      connectSocket();
      const socket = getSocket();
      if (!socket) return;

      if (socket !== activeSocket) {
        if (activeSocket) {
          activeSocket.off("nuevoMensajeGlobito", handleNuevoMensaje);
        }
        socket.on("nuevoMensajeGlobito", handleNuevoMensaje);
        if (tokenData?.id) {
          socket.emit("conectar_usuario", {
            usuario_id: tokenData.id,
            rol: tokenData.rol,
          });
        }
        activeSocket = socket;
      }
    };

    ensureSocket();
    const retry = window.setInterval(ensureSocket, 1500);

    return () => {
      window.clearInterval(retry);
      activeSocket?.off("nuevoMensajeGlobito", handleNuevoMensaje);
    };
  }, []);

  useEffect(() => {
    try {
      storage.setNotifications(JSON.stringify(notificaciones));
    } catch {
      // noop
    }
  }, [notificaciones]);

  useEffect(() => {
    try {
      storage.setNotificationsReadCutoff(String(lastReadAt));
    } catch {
      // noop
    }
  }, [lastReadAt]);

  const eliminar = (actorExternalId: string) => {
    setNotificaciones((prev) => prev.filter((n) => n.actorExternalId !== actorExternalId));
  };

  const eliminarTodas = () => {
    setNotificaciones([]);
  };

  const markAllRead = () => {
    setLastReadAt(Date.now());
  };

  const unreadCount = useMemo(
    () => notificaciones.filter((n) => toTimestamp(n.fecha) > lastReadAt).length,
    [notificaciones, lastReadAt]
  );

  return (
    <NotificacionContext.Provider
      value={{
        notificaciones,
        agregar,
        eliminar,
        eliminarTodas,
        markAllRead,
        unreadCount,
        lastReadAt,
      }}
    >
      {children}
    </NotificacionContext.Provider>
  );
};
