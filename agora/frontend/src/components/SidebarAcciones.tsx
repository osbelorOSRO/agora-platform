import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  UserPlus,
  UserX,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Settings,
  Bot,
  MessageSquare,
} from "lucide-react";
import { estilos } from "../theme/estilos";
import { openBotDashboard } from '@/utils/openDashboard';

interface Props {
  usuario: string;
  botActivo: boolean | null;
  metaInboxUnread: number;
  onOpenMetaInbox: () => void;
  onNuevo: () => void;
  onEliminar: () => void;
  onCerrarSesion: () => void;
}

const SidebarAcciones: React.FC<Props> = ({
  usuario,
  botActivo,
  metaInboxUnread,
  onOpenMetaInbox,
  onNuevo,
  onEliminar,
  onCerrarSesion,
}) => {
  const navigate = useNavigate();
  const [expandido, setExpandido] = useState(false);

  const toggleExpandido = () => setExpandido((prev) => !prev);
  const handleAccesosClick = () => navigate("/accesos/welcome");
  const handleMetaInboxClick = () => {
    onOpenMetaInbox();
    navigate("/meta-inbox");
  };

  const botonAccionClass = expandido
    ? estilos.sidebarAcciones.botonAccion
    : estilos.sidebarAcciones.botonAccionCollapsed;

  const estadoBotColor =
    botActivo === null ? "bg-yellow-400" : botActivo ? "bg-green-400" : "bg-red-500";
  const estadoBotTexto =
    botActivo === null ? "Estado desconocido" : botActivo ? "Bot activo" : "Bot desconectado";

  return (
    <motion.aside
      initial={{ x: 0, opacity: 1 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className={`${estilos.sidebarAcciones.contenedor} ${
        expandido ? "w-64" : "w-20"
      } fixed left-0 top-0 h-screen z-40`}
    >
      {/* ZONA USUARIO */}
      <div className="flex items-center gap-3 px-2 mt-10 mb-6">
        <div
          className={
            expandido
              ? estilos.sidebarAcciones.avatarExpandido
              : estilos.sidebarAcciones.avatarColapsado
          }
        >
          <User className={estilos.sidebarAcciones.sidebarIcon} />
        </div>

        {expandido && (
          <div className="flex flex-col gap-1 overflow-hidden">
            <span className={estilos.sidebarAcciones.nombreUsuario} title={usuario}>
              {usuario}
            </span>
            <button
              onClick={onCerrarSesion}
              className={`${estilos.sidebarAcciones.botonLogout} !px-2 !py-1`}
            >
              <LogOut className={estilos.sidebarAcciones.sidebarIcon} />
              <span className={estilos.sidebarAcciones.label}>Cerrar sesión</span>
            </button>
          </div>
        )}
      </div>

      {/* BOTÓN EXPANDIR / COLAPSAR */}
      <button
        onClick={toggleExpandido}
        className={estilos.sidebarAcciones.btnExpandir}
        title={expandido ? "Colapsar" : "Expandir"}
      >
        {expandido ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* ACCIONES PRINCIPALES */}
      <div className={estilos.sidebarAcciones.accionesWrapper}>
        {/* Bot Dashboard (estado + click) */}
        <button
          onClick={openBotDashboard}
          className={`${botonAccionClass} relative`}
          type="button"
          title={`Estado: ${estadoBotTexto} - Click dashboard`}
        >
          <div className="relative">
            <Bot className={estilos.sidebarAcciones.sidebarIcon} />
            <span
              className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border border-zinc-900 ${estadoBotColor}`}
            />
          </div>
          {expandido && (
            <span className={estilos.sidebarAcciones.label}>
              {estadoBotTexto}
            </span>
          )}
        </button>

        <button onClick={onNuevo} className={botonAccionClass}>
          <UserPlus className={estilos.sidebarAcciones.sidebarIcon} />
          {expandido && <span className={estilos.sidebarAcciones.label}>Nuevo cliente</span>}
        </button>

        <button onClick={onEliminar} className={botonAccionClass}>
          <UserX className={estilos.sidebarAcciones.sidebarIcon} />
          {expandido && <span className={estilos.sidebarAcciones.label}>Eliminar cliente</span>}
        </button>

        <button onClick={handleMetaInboxClick} className={`${botonAccionClass} relative`}>
          <div className="relative">
            <MessageSquare className={estilos.sidebarAcciones.sidebarIcon} />
            {metaInboxUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-zinc-900 bg-green-400" />
            )}
          </div>
          {expandido && <span className={estilos.sidebarAcciones.label}>Meta Inbox</span>}
        </button>
      </div>

      {/* ACCESOS ABAJO */}
      <div className={estilos.sidebarAcciones.accesosWrapper}>
        <button onClick={handleAccesosClick} className={botonAccionClass}>
          <Settings className={estilos.sidebarAcciones.sidebarIcon} />
          {expandido && <span className={estilos.sidebarAcciones.label}>Accesos</span>}
        </button>
      </div>
    </motion.aside>
  );
};

export default SidebarAcciones;
