import { createContext, useEffect, useMemo, useState, useContext } from "react";
import { Notificacion } from "../types/Notificacion";
import { connectSocket, getSocket } from "../services/socket";
import { getTokenData } from "../utils/getTokenData";

const NotificacionContext = createContext<{
  notificaciones: Notificacion[];
  agregar: (n: Notificacion) => void;
  eliminar: (actorExternalId: string) => void;
  eliminarTodas: () => void;
  markAllRead: () => void;
  unreadCount: number;
} | null>(null); // <- ⚠️ Esto es mejor que poner funciones vacías

export const useNotificaciones = () => {
  const ctx = useContext(NotificacionContext);
  if (!ctx) throw new Error("useNotificaciones debe usarse dentro de NotificacionProvider");
  return ctx;
};

const STORAGE_KEY = "agora.notificaciones";
const READ_CUTOFF_KEY = "agora.notificaciones.lastReadAt";
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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? cleanupNotifications(parsed as Notificacion[]) : [];
  } catch {
    return [];
  }
};

const loadReadCutoff = (): number => {
  try {
    const raw = localStorage.getItem(READ_CUTOFF_KEY);
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

const agregar = (nueva: Notificacion | Record<string, any>) => {
  const normalized: Notificacion = {
    actorExternalId: String(nueva?.actorExternalId ?? "desconocido"),
    phone: nueva?.phone ? String(nueva.phone) : undefined,
    contenido: String(
      nueva?.contenido ??
        nueva?.contentText ??
        nueva?.mensaje ??
        "Mensaje entrante"
    ),
    fecha: String(
      nueva?.fecha ??
        nueva?.fecha_envio ??
        nueva?.timestamp ??
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notificaciones));
    } catch {
      // noop
    }
  }, [notificaciones]);

  useEffect(() => {
    try {
      localStorage.setItem(READ_CUTOFF_KEY, String(lastReadAt));
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
      }}
    >
      {children}
    </NotificacionContext.Provider>
  );
};
