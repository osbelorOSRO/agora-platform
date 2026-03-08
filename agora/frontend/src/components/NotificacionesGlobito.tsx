import { useNotificaciones } from "../context/NotificacionContext";
import { X } from "lucide-react";
import { useEffect } from "react";

const NotificacionesGlobito = () => {
  const { notificaciones, eliminar } = useNotificaciones();

  useEffect(() => {
    console.log("📢 Cambiaron las notificaciones:", notificaciones);
  }, [notificaciones]);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 w-[300px] max-w-[90%]">
      {notificaciones.map((n) => (
        <div
          key={n.clienteId}
          className="bg-white shadow-lg p-4 rounded-lg border border-gray-200"
        >
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-1 text-sm text-gray-800">
                <img
                  src="/icono169.png"
                  alt="icono notificación"
                  className="w-4 h-4 object-contain"
                />
                Nuevo mensaje de <strong className="ml-1">{n.clienteId}</strong>
              </div>
              <p className="text-xs mt-1 text-gray-600">
                {typeof n.contenido === "string"
                  ? n.contenido.slice(0, 40) + "..."
                  : "[contenido no legible]"}
              </p>
            </div>
            <button
              className="text-gray-400 hover:text-red-500 transition"
              onClick={() => eliminar(n.clienteId)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificacionesGlobito;
