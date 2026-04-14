import { createContext, useEffect, useState, useContext } from "react";
import { Notificacion } from "../types/Notificacion";
import { connectSocket, getSocket } from "../services/socket";
import { getTokenData } from "../utils/getTokenData";

const NotificacionContext = createContext<{
  notificaciones: Notificacion[];
  agregar: (n: Notificacion) => void;
  eliminar: (clienteId: string) => void;
} | null>(null); // <- ⚠️ Esto es mejor que poner funciones vacías

export const useNotificaciones = () => {
  const ctx = useContext(NotificacionContext);
  if (!ctx) throw new Error("useNotificaciones debe usarse dentro de NotificacionProvider");
  return ctx;
};

const STORAGE_KEY = "agora.notificaciones";

const loadStored = (): Notificacion[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Notificacion[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const NotificacionProvider = ({ children }: { children: React.ReactNode }) => {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>(() => loadStored());

const agregar = (nueva: Notificacion | Record<string, any>) => {
  const normalized: Notificacion = {
    clienteId: String(
      nueva?.clienteId ??
        nueva?.cliente_id ??
        nueva?.actorExternalId ??
        "desconocido"
    ),
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
    const next = [normalized, ...prev];
    const deduped = next.filter(
      (item, idx, arr) =>
        idx ===
        arr.findIndex(
          (n) =>
            n.clienteId === item.clienteId &&
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

  const eliminar = (clienteId: string) => {
    setNotificaciones((prev) => prev.filter((n) => n.clienteId !== clienteId));
  };

  return (
    <NotificacionContext.Provider value={{ notificaciones, agregar, eliminar }}>
      {children}
    </NotificacionContext.Provider>
  );
};
