import { useEffect, useState, useRef, memo } from "react";
import {
  MoreVertical,
  Pencil,
  IdCard,
} from "lucide-react";
import { ClientCardProps } from "../types/Cliente";
import { getTodasEtiquetas, cambiarEstadoIntervencion } from "../services/clientes.service";
import { getSocket } from "../services/socket";
import EstadoDropdown from "./EstadoDropdown";
import { estilos } from "../theme/estilos";
import { toast } from "react-hot-toast";
import { actualizarNombrePostgres } from "../services/actualizarNombre.service";
import { COLOR_BY_ID } from "../theme/etiquetas";
import { motion, AnimatePresence } from "framer-motion";
import type { Etiqueta } from "../types/Etiqueta";

const API_URL = import.meta.env.VITE_API_URL;

function etiquetaClasses(etiqueta?: { bg_class?: string; text_class?: string }): string {
  if (!etiqueta) return "bg-fondoCard text-textoOscuro";
  return `${etiqueta.bg_class || "bg-fondoCard"} ${etiqueta.text_class || "text-textoOscuro"}`;
}

const ClientCard: React.FC<ClientCardProps & { procesoId?: string; onActualizarEstado: (id: string, nuevoEstado: number) => void }> = ({
  cliente,
  onChat,
  procesoId,
  onActualizarEstado,
  onToggleIntervencion,
}) => {
  const [open, setOpen] = useState(false);
  const [intervenida, setIntervenida] = useState<boolean>(cliente.intervenida ?? false);
  const [estadoCargando, setEstadoCargando] = useState(true);
  const [etiquetas, setEtiquetas] = useState<Etiqueta[]>([]);
  const [nombreLocal, setNombreLocal] = useState(cliente.nombre);
  // 🔥 NUEVO: Estado local para etiqueta_actual (viene del backend)
  const [etiquetaActualNombre, setEtiquetaActualNombre] = useState<string | null>(
    cliente.etiqueta_actual || null
  );
  const menuRef = useRef<HTMLDivElement | null>(null);

  const editarNombre = async (clienteId: string) => {
    const nuevoNombre = prompt("Nuevo nombre (solo PostgreSQL):", nombreLocal);
    if (!nuevoNombre?.trim()) return;

    const ok = await actualizarNombrePostgres(clienteId, nuevoNombre.trim());
    if (ok) {
      setNombreLocal(nuevoNombre.trim());
      toast.success("Nombre actualizado en PostgreSQL");
    } else {
      toast.error("Error al actualizar el nombre");
    }
  };

  useEffect(() => {
    setIntervenida(cliente.intervenida ?? false);
    setNombreLocal(cliente.nombre);
    setEtiquetaActualNombre(cliente.etiqueta_actual || null); // 🔥 Actualizar cuando cambia el prop
    setEstadoCargando(false);
  }, [cliente]);

  useEffect(() => {
    const cargarEtiquetas = async () => {
      const res = await getTodasEtiquetas();
      const enriquecidas = res.map((e) => {
        const color = COLOR_BY_ID[Number(e.color_id)];
        return color ? { ...e, ...color } : e;
      });
      setEtiquetas(enriquecidas);
    };
    cargarEtiquetas();
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("joinRoom", cliente.cliente_id);

    const listenerEstado = (data: { clienteId: string; estado: string }) => {
      if (data.clienteId === cliente.cliente_id) {
        setIntervenida(data.estado === "intervenida");
        setEstadoCargando(false);
      }
    };
    const listenerDelegacion = (data: { cliente_id: string }) => {
      if (data.cliente_id === cliente.cliente_id) {
        setIntervenida(true);
      }
    };

    // 🔥 NUEVO: Escuchar evento estadoActualizado
    const listenerEstadoActualizado = (data: {
      clienteId: string;
      estadoActual: number;
      etiquetaActual: string;
    }) => {
      if (data.clienteId === cliente.cliente_id) {
        console.log(`🔄 [ClientCard] Estado actualizado para ${cliente.cliente_id}:`, data);
        setEtiquetaActualNombre(data.etiquetaActual);
      }
    };

    // 🔥 NUEVO: Escuchar evento intervencionCambiada
    const listenerIntervencionCambiada = (data: {
      clienteId: string;
      intervenida: boolean;
    }) => {
      if (data.clienteId === cliente.cliente_id) {
        console.log(`🎯 [ClientCard] Intervención cambiada para ${cliente.cliente_id}:`, data);
        setIntervenida(data.intervenida);
      }
    };

    socket.on("clienteActualizado", listenerEstado);
    socket.on("delegar_a_humano", listenerDelegacion);
    socket.on("estadoActualizado", listenerEstadoActualizado); // 🔥 NUEVO
    socket.on("intervencionCambiada", listenerIntervencionCambiada); // 🔥 NUEVO

    return () => {
      socket.off("clienteActualizado", listenerEstado);
      socket.off("delegar_a_humano", listenerDelegacion);
      socket.off("estadoActualizado", listenerEstadoActualizado); // 🔥 NUEVO
      socket.off("intervencionCambiada", listenerIntervencionCambiada); // 🔥 NUEVO
    };
  }, [cliente.cliente_id]);

  // 🔥 OPTIMIZADO: Buscar etiqueta solo para obtener colores (no para el nombre)
  const etiquetaActual: Etiqueta | undefined = etiquetas.find(
    (e) => Number(e.etiqueta_id) === Number(cliente.estado_actual)
  );

  const avatar =
    cliente.foto_perfil || `${API_URL}/uploads/avatares/foto_perfil_hombre_default_02.png`;

  const handleToggle = async () => {
    try {
      const nuevoEstado = !intervenida;
      const res = await cambiarEstadoIntervencion(cliente.cliente_id, nuevoEstado);

      if (res && typeof res.intervenida === "boolean") {
        setIntervenida(res.intervenida);
        if (onToggleIntervencion) onToggleIntervencion(res.intervenida);
        toast.success("Estado de intervención actualizado");
      } else {
        toast.error("No se pudo confirmar el cambio en backend");
      }
    } catch (error) {
      console.error("❌ Error al cambiar intervención:", error);
      toast.error("Error al actualizar intervención en backend");
    }
  };

  const handleEstadoActualizado = (nuevoEstado: number) => {
    onActualizarEstado(cliente.cliente_id, nuevoEstado);
    setOpen(false);
  };

  return (
    <motion.div layout className="w-full" onDoubleClick={() => onChat(cliente.cliente_id)}>
      <div ref={menuRef}>
        <div
          className={`w-full h-6 px-2.5 rounded-t-lg text-textoOscuro bg-fondoCard text-xs font-semibold flex items-center justify-between`}
        >
          {/* 🔥 OPTIMIZADO: Usar etiqueta_actual directamente del estado */}
          <span className={`${etiquetaClasses(etiquetaActual)} truncate`}>
            {etiquetaActualNombre || "—"}
          </span>
          <div
            className="relative"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen((v) => !v)}
              className={estilos.clientCard.kebabBoton}
              aria-label="Opciones"
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Escape") setOpen(false);
              }}
            >
              <MoreVertical className={estilos.clientCard.kebabIcono} />
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="panel-inline"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`text-textoOscuro bg-fondoCard px-3 pt-3 pb-3`}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Escape") setOpen(false);
              }}
            >
              <div className="px-2.5 py-2.5" onClick={(e) => e.stopPropagation()}>
                <EstadoDropdown
                  clienteId={cliente.cliente_id}
                  estadoActual={cliente.estado_actual}
                  intervenida={intervenida}
                  procesoId={procesoId}
                  onActualizado={handleEstadoActualizado}
                  onToggleIntervencion={() => {}}
                  bgClass="bg-fondoCard"
                />
              </div>

              <div className="mt-0.5 h-[6px] w-full opacity-70" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={`${estilos.clientCard.contenedor} rounded-t-none rounded-b-lg p-2.5`}>
        <div className="flex items-center gap-2">
          <div className="shrink-0">
            <img
              src={avatar}
              alt="foto perfil"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-textoOscuro ring-offset-[1px] bg-neutral-700"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `${API_URL}/uploads/avatares/foto_perfil_hombre_default_02.png`;
              }}
            />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {/* Línea 1: nombre y editar */}
            <div className="flex items-center justify-between">
              <h2 className={estilos.clientCard.nombreCliente + " truncate"}>
                {nombreLocal || "sin nombre"}
              </h2>
              <button
                onClick={() => editarNombre(cliente.cliente_id)}
                title="Editar Nombre"
                className="text-textoClaro/80 hover:text-azulOscuro transition"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>

            {/* Línea 2: estado humano/bot y toggle */}
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`${estilos.clientCard.atendidoLabel} flex-1 min-w-0`}>
                {estadoCargando ? (
                  <span className="text-azulOscuro/70">...</span>
                ) : intervenida ? (
                  "Atendido humano"
                ) : (
                  "Atendido bot"
                )}
              </span>
              <div
                role="switch"
                tabIndex={0}
                aria-checked={intervenida}
                onClick={handleToggle}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleToggle();
                  }
                }}
                className={`relative inline-flex flex-shrink-0 h-5 w-10 border-2 rounded-full cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${
                    intervenida
                      ? "border-[var(--toggleON)] bg-[var(--toggleON)]/20"
                      : "border-[var(--toggleOFF)] bg-[var(--toggleOFF)]/20"
                  }
                `}
                title={
                  intervenida
                    ? "Intervención Humana Activada"
                    : "Intervención Humana Desactivada"
                }
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full transform ring-0 transition ease-in-out duration-200
                    ${intervenida ? "translate-x-5" : "translate-x-0"}
                  `}
                  style={{
                    backgroundColor: "#00ED64",
                    boxShadow: "0 0 12px rgba(0, 237, 100, 0.8), 0 0 4px rgba(0, 237, 100, 1)",
                  }}
                />
              </div>
            </div>

            {/* Línea 3: ID del cliente */}
            <div className="flex items-center mt-0.5">
              <span className={estilos.clientCard.lineaID}>
                <IdCard className="w-4 h-4 text-textoOscuro" />
                <span className="truncate">{cliente.cliente_id}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default memo(ClientCard);
