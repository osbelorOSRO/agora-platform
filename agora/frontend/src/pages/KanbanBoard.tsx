import {
  connectSocket,
  getSocket,
  onRefrescarClientes,
  offRefrescarClientes,
  onClienteCreado,
  offClienteCreado,
  onProcesoCreado,
  offProcesoCreado,
  onEstadoActualizado,
  offEstadoActualizado,
  onIntervencionCambiada,
  offIntervencionCambiada,
  onProcesoCerrado,
  offProcesoCerrado,
  onMetaInboxMessageNew,
  offMetaInboxMessageNew,
} from "../services/socket";
import React, { useEffect, useState } from "react";
import ClientCard from "../components/ClientCard";
import { Cliente } from "../types/Cliente";
import FloatingChat from "../components/FloatingChat";
import FormNuevoCliente from "../components/FormNuevoCliente";
import FormEliminarCliente from "../components/FormEliminarCliente";
import SidebarAcciones from "../components/SidebarAcciones";
import { estilos } from "../theme/estilos";
import { getTokenData } from "../utils/getTokenData";
import {
  listarClientesActivos,
  listarClientesInactivos,
  listarClientesCerrados,
  obtenerClientePorId,
} from "../services/clientes.service";
import useEsMovil from "../hooks/useEsMovil";
import { useNotificaciones } from "../context/NotificacionContext";
import NotificacionesGlobito from "../components/NotificacionesGlobito";
import TarjetaCliente from "@/components/tarjetas/TarjetaCliente";
import TarjetaScraping from "@/components/tarjetas/TarjetaScraping";
import TarjetaCierreProceso from "@/components/tarjetas/TarjetaCierreProceso";
import { Search, Users, UserX, UserCheck, X } from "lucide-react";
import NuevoChatButton from "@/components/NuevoChatButton";
import MenuClientesLite from "@/components/MenuClientesLite";
import type { ClienteLite } from "@/types/cliente";
import { abrirOContinuarChat, obtenerProcesoActivoPorCliente } from "@/services/procesos.service";
import ChatAnimation from "../components/ChatAnimation";

const KanbanBoard = () => {
  type MetaInboxToast = {
    id: string;
    actorExternalId: string;
    contentText: string;
  };

  const [usuario, setUsuario] = useState("");
  const [clientesActivos, setClientesActivos] = useState<Cliente[]>([]);
  const [clientesInactivos, setClientesInactivos] = useState<Cliente[]>([]);
  const [clientesCerrados, setClientesCerrados] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [botActivo, setBotActivo] = useState<boolean | null>(null);
  const [chatsAbiertos, setChatsAbiertos] = useState<string[]>([]);
  const [clienteActualId, setClienteActualId] = useState<string | null>(null);
  const [procesoActualId, setProcesoActualId] = useState<string | null>(null);
  const [tipoIdActual, setTipoIdActual] = useState<string | null>(null);
  const [procesosPorCliente, setProcesosPorCliente] = useState<Record<string, string>>({});
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarEliminar, setMostrarEliminar] = useState(false);
  const [panelActivo, setPanelActivo] = useState<"cliente" | "scraping" | "cierre" | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<"activos" | "inactivos" | "cerrados">("activos");
  const [busquedaId, setBusquedaId] = useState("");
  const [resultadoBusqueda, setResultadoBusqueda] = useState<Cliente | null>(null);
  const [selectorLiteAbierto, setSelectorLiteAbierto] = useState(false);
  const [metaInboxUnread, setMetaInboxUnread] = useState(0);
  const [metaInboxToasts, setMetaInboxToasts] = useState<MetaInboxToast[]>([]);
  const esMovil = useEsMovil();
  const { agregar, eliminar } = useNotificaciones();

  useEffect(() => {
    if (!clienteActualId) {
      setTipoIdActual(null);
      return;
    }
    const cliente =
      clientesActivos.find(c => c.cliente_id === clienteActualId) ||
      clientesInactivos.find(c => c.cliente_id === clienteActualId) ||
      clientesCerrados.find(c => c.cliente_id === clienteActualId);

    setTipoIdActual(cliente?.tipo_id || null);
  }, [clienteActualId, clientesActivos, clientesInactivos, clientesCerrados]);

  const abrirChat = async (clienteId: string) => {
    if (!chatsAbiertos.includes(clienteId)) {
      setChatsAbiertos(prev => [...prev, clienteId]);
    }
    setClienteActualId(clienteId);
    try {
      const proceso = await obtenerProcesoActivoPorCliente(clienteId);
      if (proceso?.id) {
        setProcesoActualId(proceso.id);
        setProcesosPorCliente(prev => ({
          ...prev,
          [clienteId]: proceso.id,
        }));
      } else {
        console.warn("⚠️ No se encontró proceso activo para el cliente:", clienteId);
      }
    } catch (err) {
      console.error("❌ Error al obtener procesos:", err);
    }
    eliminar(clienteId);
  };

  const handlePickClienteLite = async (c: ClienteLite) => {
    const tokenData = getTokenData();
    if (!tokenData) {
      alert("Sesión expirada. Inicia sesión nuevamente.");
      return;
    }
    try {
      const r = await abrirOContinuarChat(c.cliente_id, tokenData.id, c);
      setSelectorLiteAbierto(false);
      if (!chatsAbiertos.includes(c.cliente_id)) {
        setChatsAbiertos(prev => [...prev, c.cliente_id]);
      }
      setClienteActualId(c.cliente_id);
      setProcesoActualId(r.proceso_id);
      setProcesosPorCliente(prev => ({ ...prev, [c.cliente_id]: r.proceso_id }));

      const cliente =
        clientesActivos.find(x => x.cliente_id === c.cliente_id) ||
        clientesInactivos.find(x => x.cliente_id === c.cliente_id) ||
        clientesCerrados.find(x => x.cliente_id === c.cliente_id);
      setTipoIdActual(cliente?.tipo_id || null);
    } catch (e) {
      console.error("❌ No se pudo abrir/continuar el chat:", e);
      alert("No se pudo iniciar la conversación. Intenta nuevamente.");
    }
  };

  const cerrarChat = (clienteId: string) => {
    setChatsAbiertos(prev => prev.filter(id => id !== clienteId));
    if (clienteActualId === clienteId) {
      const index = chatsAbiertos.indexOf(clienteId);
      if (chatsAbiertos.length > 1) {
        const siguiente =
          index === chatsAbiertos.length - 1 ? chatsAbiertos[index - 1] : chatsAbiertos[index + 1];
        setClienteActualId(siguiente);
        setProcesoActualId(procesosPorCliente[siguiente] ?? null);
      } else {
        setClienteActualId(null);
        setProcesoActualId(null);
      }
    }
  };

  const handleNextCliente = () => {
    if (!clienteActualId) return;
    const index = chatsAbiertos.findIndex(id => id === clienteActualId);
    if (index !== -1 && index < chatsAbiertos.length - 1) {
      const siguiente = chatsAbiertos[index + 1];
      setClienteActualId(siguiente);
      setProcesoActualId(procesosPorCliente[siguiente] ?? null);
    }
  };

  const handlePrevCliente = () => {
    if (!clienteActualId) return;
    const index = chatsAbiertos.findIndex(id => id === clienteActualId);
    if (index > 0) {
      const anterior = chatsAbiertos[index - 1];
      setClienteActualId(anterior);
      setProcesoActualId(procesosPorCliente[anterior] ?? null);
    }
  };

  const verificarEstadoBot = () => {
    fetch(`${import.meta.env.VITE_ESTADO_BOT_URL}/estado-bot`)
      .then(res => res.json())
      .then(data => setBotActivo(data.conectado ?? false))
      .catch(err => {
        console.error("❌ Error consultando estado del bot (socket):", err);
        setBotActivo(false);
      });
  };

  const buscarCliente = async () => {
    if (!busquedaId.trim()) {
      setResultadoBusqueda(null);
      return;
    }
    try {
      const cliente = await obtenerClientePorId(busquedaId.trim());
      setResultadoBusqueda(cliente || null);
    } catch (err) {
      console.error("❌ Error buscando cliente:", err);
    }
  };

  useEffect(() => {
    const tokenData = getTokenData();
    if (!tokenData) {
      setCargando(false);
      window.location.href = "/login";
      return;
    }
    setUsuario(`${tokenData.nombre} ${tokenData.apellido}`);

    // Cargar datos iniciales
    Promise.all([listarClientesActivos(), listarClientesInactivos(), listarClientesCerrados()])
      .then(([activos, inactivos, cerrados]) => {
        setClientesActivos(Array.isArray(activos) ? activos : []);
        setClientesInactivos(Array.isArray(inactivos) ? inactivos : []);
        setClientesCerrados(Array.isArray(cerrados) ? cerrados : []);
        setCargando(false);
      })
      .catch(err => {
        console.error("Error al obtener clientes:", err);
        setCargando(false);
      });

    verificarEstadoBot();
    const interval = setInterval(verificarEstadoBot, 30000);

    // Conectar WebSocket
    connectSocket();
    const socket = getSocket();
    if (socket && tokenData?.id) {
      socket.emit("conectar_usuario", {
        usuario_id: tokenData.id,
        rol: tokenData.rol,
      });
    }

    // Listener de mensajes globito
    socket?.on("nuevoMensajeGlobito", data => {
      agregar(data);
      const audio = new Audio("/sound/notificacion.mp3");
      audio.play().catch(() => {});
    });

    // 🔥 LISTENER 1: Cliente Creado
    onClienteCreado((data) => {
      console.log("🆕 Cliente creado:", data);

      const nuevoCliente: Cliente = {
        cliente_id: data.clienteId,
        tipo_id: data.tipoId,
        nombre: data.nombre,
        foto_perfil: data.fotoPerfil,
        estado_actual: 1,
        etiqueta_actual: "Nuevo", // 🔥 Viene con etiqueta
        intervenida: false,
      };

      // Agregar a activos sin refetch
      setClientesActivos(prev => [nuevoCliente, ...prev]);
    });

    // 🔥 LISTENER 2: Proceso Creado
    onProcesoCreado((data) => {
      console.log("📋 Proceso creado:", data);

      // Mover cliente de inactivos a activos
      setClientesInactivos(prev => {
        const cliente = prev.find(c => c.cliente_id === data.clienteId);
        if (cliente) {
          setClientesActivos(prevActivos => [cliente, ...prevActivos]);
          return prev.filter(c => c.cliente_id !== data.clienteId);
        }
        return prev;
      });

      // Guardar proceso_id
      setProcesosPorCliente(prev => ({
        ...prev,
        [data.clienteId]: data.procesoId,
      }));
    });

    // 🔥 LISTENER 3: Estado Actualizado
    onEstadoActualizado((data) => {
      console.log("🔄 Estado actualizado:", data);

      const actualizarEstado = (clientes: Cliente[]) =>
        clientes.map(c =>
          c.cliente_id === data.clienteId
            ? {
                ...c,
                estado_actual: data.estadoActual,
                etiqueta_actual: data.etiquetaActual, // 🔥 Actualizar etiqueta
              }
            : c
        );

      setClientesActivos(actualizarEstado);
      setClientesInactivos(actualizarEstado);
      setClientesCerrados(actualizarEstado);
    });

    // 🔥 LISTENER 4: Intervención Cambiada
    onIntervencionCambiada((data) => {
      console.log("🎯 Intervención cambiada:", data);

      const actualizarIntervencion = (clientes: Cliente[]) =>
        clientes.map(c =>
          c.cliente_id === data.clienteId
            ? { ...c, intervenida: data.intervenida }
            : c
        );

      setClientesActivos(actualizarIntervencion);
      setClientesInactivos(actualizarIntervencion);
      setClientesCerrados(actualizarIntervencion);
    });

    // 🔥 LISTENER 5: Proceso Cerrado
    onProcesoCerrado((data) => {
      console.log("🔒 Proceso cerrado:", data);

      // Mover cliente de activos a inactivos
      setClientesActivos(prev => {
        const cliente = prev.find(c => c.cliente_id === data.clienteId);
        if (cliente) {
          // Agregar a inactivos
          setClientesInactivos(prevInactivos => [cliente, ...prevInactivos]);
          // Remover de activos
          return prev.filter(c => c.cliente_id !== data.clienteId);
        }
        return prev;
      });

      // Remover proceso_id del estado
      setProcesosPorCliente(prev => {
        const { [data.clienteId]: _, ...rest } = prev;
        return rest;
      });
    });

    // ✅ MANTENER: Listener genérico como fallback
    onRefrescarClientes(() => {
      console.log("♻️ Refrescando clientes (fallback):", filtroEstado);

      switch (filtroEstado) {
        case "activos":
          listarClientesActivos().then(activos => setClientesActivos(activos || []));
          break;
        case "inactivos":
          listarClientesInactivos().then(inactivos => setClientesInactivos(inactivos || []));
          break;
        case "cerrados":
          listarClientesCerrados().then(cerrados => setClientesCerrados(cerrados || []));
          break;
      }
    });

    onMetaInboxMessageNew((payload) => {
      const direction = String((payload as any)?.direction || "");
      const actorExternalId = String((payload as any)?.actorExternalId || "");
      const contentText = String((payload as any)?.contentText || "").trim() || "(mensaje sin texto)";

      if (direction !== "INCOMING") return;
      if (window.location.pathname === "/meta-inbox") return;

      setMetaInboxUnread((prev) => prev + 1);
      setMetaInboxToasts((prev) => {
        const withoutSameActor = prev.filter((item) => item.actorExternalId !== actorExternalId);
        return [
          ...withoutSameActor,
          {
            id: `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
            actorExternalId,
            contentText,
          },
        ];
      });
    });

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off("nuevoMensajeGlobito");
      }
      offRefrescarClientes();
      offClienteCreado();
      offProcesoCreado();
      offEstadoActualizado();
      offIntervencionCambiada();
      offProcesoCerrado();
      offMetaInboxMessageNew();
    };
  }, []);

  const listaFiltrada =
    resultadoBusqueda
      ? [resultadoBusqueda]
      : filtroEstado === "activos"
      ? clientesActivos
      : filtroEstado === "inactivos"
      ? clientesInactivos
      : clientesCerrados;

  useEffect(() => {
    (async () => {
      const toPrefetch = listaFiltrada
        .slice(0, 20)
        .map(c => c.cliente_id)
        .filter(id => !procesosPorCliente[id]);
      for (const id of toPrefetch) {
        try {
          const proceso = await obtenerProcesoActivoPorCliente(id);
          if (proceso?.id) {
            setProcesosPorCliente(prev => ({ ...prev, [id]: proceso.id }));
          }
        } catch {}
      }
    })();
  }, [listaFiltrada]);

  return (
    <div className="flex h-screen overflow-hidden">
      <SidebarAcciones
        usuario={usuario}
        botActivo={botActivo}
        metaInboxUnread={metaInboxUnread}
        onOpenMetaInbox={() => {
          setMetaInboxUnread(0);
          setMetaInboxToasts([]);
        }}
        onNuevo={() => setMostrarFormulario(true)}
        onEliminar={() => setMostrarEliminar(true)}
        onCerrarSesion={() => {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }}
      />

      <div className="flex-1 ml-20">
        <div className={estilos.kanban.contenedor}>
          <div className="flex justify-end px-4 pt-3">
            <NuevoChatButton onClick={() => setSelectorLiteAbierto(true)} />
          </div>

          <div className={estilos.chatExpandido.contenedor}>
            {cargando ? (
              <div className="flex items-center justify-center h-full text-sm text-grisOscuro">
                Cargando clientes...
              </div>
            ) : (
              <>
                {(!esMovil || !clienteActualId) && (
                  <aside
                    className={
                      esMovil && !clienteActualId
                        ? "w-full px-2 py-4"
                        : estilos.chatExpandido.panelClientes
                    }
                  >
                    <div className="flex flex-col gap-2 mb-4">
                      <div className="flex">
                        <input
                          type="text"
                          placeholder="Buscar por cliente ID..."
                          value={busquedaId}
                          onChange={e => setBusquedaId(e.target.value)}
                          className="flex-1 border p-2 rounded-l text-[11px] font-normal placeholder:text-[11px] placeholder:font-normal"
                        />
                        <button
                          onClick={buscarCliente}
                          className="bg-azulOscuro text-white px-3 rounded-r text-[11px] font-normal"
                        >
                          <Search size={16} />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          key="activos-tab"
                          onClick={() => {
                            setFiltroEstado("activos");
                            setResultadoBusqueda(null);
                            setTipoIdActual(null);
                          }}
                          className={`flex items-center gap-1 px-3 py-1 rounded text-[11px] ${
                            filtroEstado === "activos"
                              ? "bg-azulOscuro text-white font-semibold"
                              : "bg-grisClaro text-grisOscuro"
                          }`}
                        >
                          <UserCheck size={15} /> Activos
                        </button>
                        <button
                          key="inactivos-tab"
                          onClick={() => {
                            setFiltroEstado("inactivos");
                            setResultadoBusqueda(null);
                            setTipoIdActual(null);
                          }}
                          className={`flex items-center gap-1 px-3 py-1 rounded text-[11px] ${
                            filtroEstado === "inactivos"
                              ? "bg-azulOscuro text-white font-semibold"
                              : "bg-grisClaro text-grisOscuro"
                          }`}
                        >
                          <UserX size={15} /> Inactivos
                        </button>
                        <button
                          key="cerrados-tab"
                          onClick={() => {
                            setFiltroEstado("cerrados");
                            setResultadoBusqueda(null);
                            setTipoIdActual(null);
                          }}
                          className={`flex items-center gap-1 px-3 py-1 rounded text-[11px] ${
                            filtroEstado === "cerrados"
                              ? "bg-azulOscuro text-white font-semibold"
                              : "bg-grisClaro text-grisOscuro"
                          }`}
                        >
                          <Users size={15} /> Cerrados
                        </button>
                      </div>
                    </div>
                    <div className={estilos.chatExpandido.tarjetasClientes}>
                      {listaFiltrada.map(cliente => (
                        <ClientCard
                          key={cliente.cliente_id}
                          cliente={cliente}
                          procesoId={procesosPorCliente[cliente.cliente_id]}
                          onChat={abrirChat}
                          onActualizarEstado={(id, nuevoEstadoActual) => {
                            switch (filtroEstado) {
                              case "activos":
                                setClientesActivos(prev =>
                                  prev.map(c =>
                                    c.cliente_id === id
                                      ? { ...c, estado_actual: nuevoEstadoActual }
                                      : c
                                  )
                                );
                                break;
                              case "inactivos":
                                setClientesInactivos(prev =>
                                  prev.map(c =>
                                    c.cliente_id === id
                                      ? { ...c, estado_actual: nuevoEstadoActual }
                                      : c
                                  )
                                );
                                break;
                              case "cerrados":
                                setClientesCerrados(prev =>
                                  prev.map(c =>
                                    c.cliente_id === id
                                      ? { ...c, estado_actual: nuevoEstadoActual }
                                      : c
                                  )
                                );
                                break;
                            }
                          }}
                        />
                      ))}
                    </div>
                  </aside>
                )}

                {(!esMovil || clienteActualId) && (
                  <main className={estilos.chatExpandido.ventanaChat}>
                    {clienteActualId && procesoActualId ? (
                      <>
                        <FloatingChat
                          clienteId={clienteActualId}
                          procesoId={procesoActualId}
                          tipoId={tipoIdActual}
                          onClose={() => cerrarChat(clienteActualId)}
                          onNextCliente={handleNextCliente}
                          onPrevCliente={handlePrevCliente}
                          modoExpandido={true}
                          setPanelActivo={setPanelActivo}
                        />
                        {panelActivo === "cliente" && (
                          <TarjetaCliente
                            clienteId={clienteActualId}
                            onClose={() => setPanelActivo(null)}
                          />
                        )}
                        {panelActivo === "scraping" && (
                          <TarjetaScraping
                            clienteId={clienteActualId}
                            procesoId={procesoActualId}
                            onClose={() => setPanelActivo(null)}
                          />
                        )}
                        {panelActivo === "cierre" && (
                          <TarjetaCierreProceso
                            clienteId={clienteActualId}
                            procesoId={procesoActualId}
                            onClose={() => setPanelActivo(null)}
                            onProcesoCerrado={() => {
                              // 🔥 NUEVO: Cerrar el chat cuando se cierra el proceso
                              cerrarChat(clienteActualId);
                              setPanelActivo(null);
                            }}
                          />
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <ChatAnimation />
                        <h1 className="mt-8 text-3xl font-normal text-textoOscuro font-montserrat">
                          Agora Web
                        </h1>
                        <p className="mt-4 text-textoOscuro text-center max-w-md font-montserrat">
                          Envía y recibe mensajes de tus contactos.
                        </p>
                      </div>
                    )}
                  </main>
                )}
              </>
            )}
          </div>

          {mostrarFormulario && (
            <FormNuevoCliente
              onClose={() => setMostrarFormulario(false)}
              onClienteCreado={() => window.location.reload()}
            />
          )}
          {mostrarEliminar && (
            <FormEliminarCliente
              onClose={() => setMostrarEliminar(false)}
              onClienteEliminado={() => window.location.reload()}
            />
          )}

          <MenuClientesLite
            abierto={selectorLiteAbierto}
            onClose={() => setSelectorLiteAbierto(false)}
            onPick={handlePickClienteLite}
          />

          <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 w-[300px] max-w-[90%]">
            {metaInboxToasts.map((n) => (
              <div
                key={n.id}
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
                      Nuevo mensaje en <strong className="ml-1">Meta Inbox</strong>
                    </div>
                    <p className="text-xs mt-1 text-gray-600">Actor: {n.actorExternalId}</p>
                    <p className="text-xs mt-1 text-gray-600">{n.contentText.slice(0, 60)}</p>
                  </div>
                  <button
                    className="text-gray-400 hover:text-red-500 transition"
                    onClick={() =>
                      setMetaInboxToasts((prev) => prev.filter((item) => item.id !== n.id))
                    }
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <NotificacionesGlobito />
        </div>
      </div>
    </div>
  );
};

export default KanbanBoard;
