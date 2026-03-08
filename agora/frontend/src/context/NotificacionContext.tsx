import { createContext, useState, useContext } from "react";
import { Notificacion } from "../types/Notificacion";

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

export const NotificacionProvider = ({ children }: { children: React.ReactNode }) => {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

const agregar = (nueva: Notificacion) => {
  console.log("📥 Llamando a agregar con:", nueva); // 👈 Aquí va el log
  setNotificaciones((prev) => {
    if (prev.find((n) => n.clienteId === nueva.clienteId)) return prev;
    return [...prev, nueva];
  });
};

  const eliminar = (clienteId: string) => {
    setNotificaciones((prev) => prev.filter((n) => n.clienteId !== clienteId));
  };

  return (
    <NotificacionContext.Provider value={{ notificaciones, agregar, eliminar }}>
      {children}
    </NotificacionContext.Provider>
  );
};
