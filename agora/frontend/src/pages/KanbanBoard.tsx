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
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useKanban } from "../context/KanbanContext";
import { useKanbanUI } from "../context/KanbanUIContext";
import ClientCard from "../components/ClientCard";
import { Cliente } from "../types/Cliente";
import FloatingChat from "../components/FloatingChat";
import FormNuevoCliente from "../components/FormNuevoCliente";
import FormEliminarCliente from "../components/FormEliminarCliente";
import { estilos } from "../theme/estilos";
import { getTokenData } from "../utils/getTokenData";
import {
  listarClientesActivos,
  listarClientesInactivos,
  listarClientesCerrados,
} from "../services/clientes.service";
import useEsMovil from "../hooks/useEsMovil";
import { useNotificaciones } from "../context/NotificacionContext";
import NotificacionesGlobito from "../components/NotificacionesGlobito";
import TarjetaCliente from "@/components/tarjetas/TarjetaCliente";
import TarjetaScraping from "@/components/tarjetas/TarjetaScraping";
import TarjetaCierreProceso from "@/components/tarjetas/TarjetaCierreProceso";
import { Search, Users, UserX, UserCheck, X } from "lucide-react";
import MenuClientesLite from "@/components/MenuClientesLite";
import type { ClienteLite } from "@/types/cliente";
import { abrirOContinuarChat, obtenerProcesoActivoPorCliente } from "@/services/procesos.service";
import { getClientesLite } from "@/services/clientesLite.service";
import ChatAnimation from "../components/ChatAnimation";

const KanbanBoard = () => {
  const location = useLocation();
  const processedClienteIdRef = useRef<string | null>(null);
  // Contextos
  const {
    clientesActivos,
    setClientesActivos,
    clientesInactivos,
    setClientesInactivos,
    clientesCerrados,
    setClientesCerrados,
    procesosPorCliente,
    setProcesosPorCliente,
  } = useKanban();

  const {
    filtroEstado,
    setFiltroEstado,
    clienteActualId,
    setClienteActualId,
    procesoActualId,
    setProcesoActualId,
    tipoIdActual,
    setTipoIdActual,
    chatsAbiertos,
    setChatsAbiertos,
    panelActivo,
    setPanelActivo,
    mostrarFormulario,
    setMostrarFormulario,
    mostrarEliminar,
    setMostrarEliminar,
    selectorLiteAbierto,
    setSelectorLiteAbierto,
    busquedaId,
    setBusquedaId,
    setMetaInboxUnread,
    metaInboxToasts,
    setMetaInboxToasts,
    usuario,
    setUsuario,
    cargando,
    setCargando,
  } = useKanbanUI();

  type MetaInboxToast = {
    id: string;
    actorExternalId: string;
    contentText: string;
  };

  const esMovil = useEsMovil();
  const { agregar, eliminar } = useNotificaciones();
  const [resultadosBusquedaLite, setResultadosBusquedaLite] = useState<ClienteLite[]>([]);
  const [buscandoLite, setBuscandoLite] = useState(false);

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

  const abrirChat = useCallback(async (clienteId: string) => {
    setChatsAbiertos(prev => {
      if (prev.includes(clienteId)) return prev;
      return [...prev, clienteId];
    });
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
  }, []);

  const handlePickClienteLite = useCallback(async (c: ClienteLite) => {
    const tokenData = getTokenData();
    if (!tokenData) {
      alert("Sesión expirada. Inicia sesión nuevamente.");
      return;
    }
    try {
      const r = await abrirOContinuarChat(c.cliente_id, tokenData.id, c);
      setSelectorLiteAbierto(false);
      setChatsAbiertos(prev => {
        if (prev.includes(c.cliente_id)) return prev;
        return [...prev, c.cliente_id];
      });
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
  }, [clientesActivos, clientesInactivos, clientesCerrados]);

  const openChatByClienteId = useCallback(
    async (clienteId: string) => {
      const tokenData = getTokenData();
      if (!tokenData) return;

      try {
        const r = await abrirOContinuarChat(clienteId, tokenData.id, null);
        setSelectorLiteAbierto(false);
        setChatsAbiertos((prev) => {
          if (prev.includes(clienteId)) return prev;
          return [...prev, clienteId];
        });
        setClienteActualId(clienteId);
        setProcesoActualId(r.proceso_id);
        setProcesosPorCliente((prev) => ({ ...prev, [clienteId]: r.proceso_id }));

        const cliente =
          clientesActivos.find((x) => x.cliente_id === clienteId) ||
          clientesInactivos.find((x) => x.cliente_id === clienteId) ||
          clientesCerrados.find((x) => x.cliente_id === clienteId);
        setTipoIdActual(cliente?.tipo_id || null);
      } catch (e) {
        console.error("❌ No se pudo abrir/continuar el chat:", e);
      }
    },
    [clientesActivos, clientesInactivos, clientesCerrados]
  );

  const cerrarChat = useCallback((clienteId: string) => {
    setChatsAbiertos(prev => prev.filter(id => id !== clienteId));
    if (clienteActualId === clienteId) {
      setChatsAbiertos(current => {
        const index = current.indexOf(clienteId);
        if (current.length > 1) {
          const siguiente =
            index === current.length - 1 ? current[index - 1] : current[index + 1];
          setClienteActualId(siguiente);
          setProcesoActualId(procesosPorCliente[siguiente] ?? null);
        } else {
          setClienteActualId(null);
          setProcesoActualId(null);
        }
        return current.filter(id => id !== clienteId);
      });
    }
  }, [clienteActualId, procesosPorCliente]);

  const handleNextCliente = useCallback(() => {
    if (!clienteActualId) return;
    setChatsAbiertos(current => {
      const index = current.findIndex(id => id === clienteActualId);
      if (index !== -1 && index < current.length - 1) {
        const siguiente = current[index + 1];
        setClienteActualId(siguiente);
        setProcesoActualId(procesosPorCliente[siguiente] ?? null);
      }
      return current;
    });
  }, [clienteActualId, procesosPorCliente]);

  const handlePrevCliente = useCallback(() => {
    if (!clienteActualId) return;
    setChatsAbiertos(current => {
      const index = current.findIndex(id => id === clienteActualId);
      if (index > 0) {
        const anterior = current[index - 1];
        setClienteActualId(anterior);
        setProcesoActualId(procesosPorCliente[anterior] ?? null);
      }
      return current;
    });
  }, [clienteActualId, procesosPorCliente]);

  useEffect(() => {
    const term = busquedaId.trim();

    if (!term) {
      setResultadosBusquedaLite([]);
      setBuscandoLite(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setBuscandoLite(true);
        const response = await getClientesLite({ search: term, page: 1, limit: 6 });
        if (!cancelled) {
          setResultadosBusquedaLite(response.items ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("❌ Error buscando clientes lite:", err);
          setResultadosBusquedaLite([]);
        }
      } finally {
        if (!cancelled) {
          setBuscandoLite(false);
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [busquedaId]);

  const handlePickBusqueda = useCallback(async (cliente: ClienteLite) => {
    await handlePickClienteLite(cliente);
    setBusquedaId("");
    setResultadosBusquedaLite([]);
  }, [handlePickClienteLite, setBusquedaId]);

  const handleBuscarEnter = useCallback(async () => {
    if (resultadosBusquedaLite.length === 1) {
      await handlePickBusqueda(resultadosBusquedaLite[0]);
    }
  }, [handlePickBusqueda, resultadosBusquedaLite]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const clienteIdParam = params.get("cliente");
    if (!clienteIdParam) return;

    const clienteId = clienteIdParam.trim();
    if (!clienteId) return;
    if (processedClienteIdRef.current === clienteId) return;

    processedClienteIdRef.current = clienteId;
    openChatByClienteId(clienteId);
  }, [location.search, openChatByClienteId]);

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

    // Conectar WebSocket
    connectSocket();
    const socket = getSocket();
    if (socket && tokenData?.id) {
      socket.emit("conectar_usuario", {
        usuario_id: tokenData.id,
        rol: tokenData.rol,
      });
    }

    // 🔥 LISTENER 1: Cliente Creado
    onClienteCreado((data) => {
      console.log("🆕 Cliente creado:", data);

      const nuevoCliente: Cliente = {
        cliente_id: data.clienteId,
        tipo_id: data.tipoId,
        nombre: data.nombre,
        foto_perfil: data.fotoPerfil,
        estado_actual: 1,
        etiqueta_actual: "Nuevo",
        intervenida: false,
      };

      // Agregar a activos sin refetch, evitando duplicados.
      setClientesActivos(prev => {
        const withoutCurrent = prev.filter((c) => c.cliente_id !== data.clienteId);
        return [nuevoCliente, ...withoutCurrent];
      });
    });

    // 🔥 LISTENER 2: Proceso Creado
    onProcesoCreado((data) => {
      console.log("📋 Proceso creado:", data);

      let clienteMovido: Cliente | null = null;

      // Mover cliente de inactivos a activos.
      setClientesInactivos(prev => {
        const cliente = prev.find(c => c.cliente_id === data.clienteId);
        if (cliente) {
          clienteMovido = cliente;
          return prev.filter(c => c.cliente_id !== data.clienteId);
        }
        return prev;
      });

      // Si estaba en cerrados, también debe volver a activos.
      setClientesCerrados(prev => {
        const cliente = prev.find(c => c.cliente_id === data.clienteId);
        if (cliente) {
          clienteMovido = cliente;
          return prev.filter(c => c.cliente_id !== data.clienteId);
        }
        return prev;
      });

      if (clienteMovido) {
        setClientesActivos(prevActivos => {
          const withoutCurrent = prevActivos.filter(c => c.cliente_id !== data.clienteId);
          return [clienteMovido as Cliente, ...withoutCurrent];
        });
      } else {
        // Fallback: aseguramos sincronía si el cliente no estaba en memoria local.
        listarClientesActivos().then((activos) => setClientesActivos(activos || []));
      }

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
                etiqueta_actual: data.etiquetaActual,
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

      let clienteCerrado: Cliente | null = null;

      // Mover cliente de activos a inactivos
      setClientesActivos(prev => {
        const cliente = prev.find(c => c.cliente_id === data.clienteId);
        if (cliente) {
          clienteCerrado = cliente;
          return prev.filter(c => c.cliente_id !== data.clienteId);
        }
        return prev;
      });

      if (clienteCerrado) {
        setClientesInactivos(prevInactivos => {
          const withoutCurrent = prevInactivos.filter(c => c.cliente_id !== data.clienteId);
          return [clienteCerrado as Cliente, ...withoutCurrent];
        });
      } else {
        listarClientesInactivos().then((inactivos) => setClientesInactivos(inactivos || []));
      }

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
  }, [filtroEstado]);

  const listaFiltrada = useMemo(() => {
    return filtroEstado === "activos"
      ? clientesActivos
      : filtroEstado === "inactivos"
      ? clientesInactivos
      : clientesCerrados;
  }, [filtroEstado, clientesActivos, clientesInactivos, clientesCerrados]);

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
  }, [listaFiltrada, procesosPorCliente]);

  return (
    <div className="flex h-[calc(100vh-88px)] min-h-0 overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <div className={estilos.kanban.contenedor}>
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
                      <div className="relative">
                        <div className="flex">
                          <input
                            type="text"
                            placeholder="Buscar por nombre o cliente ID..."
                            value={busquedaId}
                            onChange={e => setBusquedaId(e.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                handleBuscarEnter();
                              }
                              if (event.key === "Escape") {
                                setBusquedaId("");
                                setResultadosBusquedaLite([]);
                              }
                            }}
                            className="flex-1 rounded-l border border-borde bg-fondoClient px-3 py-2 text-[11px] font-montserrat text-textoOscuro placeholder:text-[11px] placeholder:text-textoOscuro/60 focus:outline-none focus:ring-2 focus:ring-azulPrimario/60"
                          />
                          <button
                            onClick={() => handleBuscarEnter()}
                            className="rounded-r border border-l-0 border-borde bg-fondoCard px-3 text-[11px] font-montserrat text-textoOscuro transition-colors hover:bg-fondoCard/80"
                            type="button"
                          >
                            <Search size={16} />
                          </button>
                        </div>

                        {busquedaId.trim() ? (
                          <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-borde bg-fondoCard/95 backdrop-blur-md shadow-2xl">
                            {buscandoLite ? (
                              <div className="px-3 py-3 text-[11px] text-textoOscuro/70">
                                Buscando contactos...
                              </div>
                            ) : resultadosBusquedaLite.length > 0 ? (
                              <div className="max-h-72 overflow-y-auto">
                                {resultadosBusquedaLite.map((cliente) => (
                                  <button
                                    key={cliente.cliente_id}
                                    type="button"
                                    onClick={() => handlePickBusqueda(cliente)}
                                    className="flex w-full items-center gap-3 border-b border-borde/50 px-3 py-3 text-left transition hover:bg-fondoClient/60"
                                  >
                                    <img
                                      src={cliente.foto_perfil || `${import.meta.env.VITE_API_URL}/uploads/avatares/foto_perfil_hombre_default_02.png`}
                                      alt={cliente.nombre || cliente.cliente_id}
                                      className="h-10 w-10 rounded-full object-cover"
                                    />
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-textoOscuro">
                                        {cliente.nombre?.trim() || "Sin nombre"}
                                      </p>
                                      <p className="truncate text-[11px] text-textoOscuro/60">
                                        {cliente.cliente_id}
                                      </p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="px-3 py-3 text-[11px] text-textoOscuro/70">
                                No encontramos coincidencias.
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <button
                          key="activos-tab"
                          onClick={() => {
                            setFiltroEstado("activos");
                            setTipoIdActual(null);
                          }}
                          className={`flex items-center gap-1 rounded px-3 py-1 text-[11px] font-montserrat ${
                            filtroEstado === "activos"
                              ? "bg-fondoCard text-textoOscuro"
                              : "bg-fondoClient text-textoOscuro/70"
                          }`}
                        >
                          <UserCheck size={15} /> Activos
                        </button>
                        <button
                          key="inactivos-tab"
                          onClick={() => {
                            setFiltroEstado("inactivos");
                            setTipoIdActual(null);
                          }}
                          className={`flex items-center gap-1 rounded px-3 py-1 text-[11px] font-montserrat ${
                            filtroEstado === "inactivos"
                              ? "bg-fondoCard text-textoOscuro"
                              : "bg-fondoClient text-textoOscuro/70"
                          }`}
                        >
                          <UserX size={15} /> Inactivos
                        </button>
                        <button
                          key="cerrados-tab"
                          onClick={() => {
                            setFiltroEstado("cerrados");
                            setTipoIdActual(null);
                          }}
                          className={`flex items-center gap-1 rounded px-3 py-1 text-[11px] font-montserrat ${
                            filtroEstado === "cerrados"
                              ? "bg-fondoCard text-textoOscuro"
                              : "bg-fondoClient text-textoOscuro/70"
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

          <div className="fixed bottom-4 right-4 z-[9999] flex w-[300px] max-w-[90%] flex-col gap-3">
            {metaInboxToasts.map((n) => (
              <div
                key={n.id}
                className="rounded-lg border border-borde bg-fondoCard/95 p-4 text-textoOscuro shadow-lg backdrop-blur-md"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1 text-sm font-montserrat text-textoOscuro">
                      <img
                        src="/icono169.png"
                        alt="icono notificación"
                        className="w-4 h-4 object-contain"
                      />
                      Nuevo mensaje en <strong className="ml-1">Meta Inbox</strong>
                    </div>
                    <p className="mt-1 text-xs text-textoOscuro/70">Actor: {n.actorExternalId}</p>
                    <p className="mt-1 text-xs text-textoOscuro/70">{n.contentText.slice(0, 60)}</p>
                  </div>
                  <button
                    className="text-textoOscuro/60 transition hover:text-red-400"
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
