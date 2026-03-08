// src/services/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const connectSocket = () => {
  if (socket?.connected) return;
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const token = localStorage.getItem("token");

  if (!token) {
    console.warn("❌ No se encontró el token JWT en localStorage.");
    return;
  }

  socket = io(import.meta.env.VITE_WEBSOCKET_URL, {
    auth: { token },
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    console.log("🟢 Conectado al WebSocket con ID:", socket?.id);
  });

  socket.on("conexion_autorizada", (payload) => {
    console.log("🔐 Conexión autorizada:", payload);

    if (payload?.usuario_id) {
      const sala = `usuario_${payload.usuario_id}`;
      socket?.emit("joinRoom", sala);
      console.log(`✅ Unido a sala: ${sala}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 Desconectado del WebSocket");
  });

  socket.on("error", (err) => {
    console.error("🚨 Error en WebSocket:", err);
  });
};

// ✅ MANTENER: Evento genérico (compatibilidad)
export const onRefrescarClientes = (callback: () => void) => {
  if (socket) {
    socket.on("refrescarClientes", callback);
  }
};

export const offRefrescarClientes = () => {
  if (socket) {
    socket.off("refrescarClientes");
  }
};

// 🔥 NUEVO: Cliente Creado
export const onClienteCreado = (
  callback: (data: {
    clienteId: string;
    tipoId: string;
    nombre: string;
    fotoPerfil?: string;
    timestamp: string;
  }) => void
) => {
  if (socket) {
    socket.on("clienteCreado", callback);
  }
};

export const offClienteCreado = () => {
  if (socket) {
    socket.off("clienteCreado");
  }
};

// 🔥 NUEVO: Proceso Creado
export const onProcesoCreado = (
  callback: (data: {
    clienteId: string;
    procesoId: string;
    timestamp: string;
  }) => void
) => {
  if (socket) {
    socket.on("procesoCreado", callback);
  }
};

export const offProcesoCreado = () => {
  if (socket) {
    socket.off("procesoCreado");
  }
};

// 🔥 NUEVO: Estado Actualizado
export const onEstadoActualizado = (
  callback: (data: {
    clienteId: string;
    estadoActual: number;
    etiquetaActual: string;
    timestamp: string;
  }) => void
) => {
  if (socket) {
    socket.on("estadoActualizado", callback);
  }
};

export const offEstadoActualizado = () => {
  if (socket) {
    socket.off("estadoActualizado");
  }
};

// 🔥 NUEVO: Intervención Cambiada
export const onIntervencionCambiada = (
  callback: (data: {
    clienteId: string;
    intervenida: boolean;
    timestamp: string;
  }) => void
) => {
  if (socket) {
    socket.on("intervencionCambiada", callback);
  }
};

export const offIntervencionCambiada = () => {
  if (socket) {
    socket.off("intervencionCambiada");
  }
};

// 🔥 NUEVO: Proceso Cerrado
export const onProcesoCerrado = (
  callback: (data: {
    clienteId: string;
    procesoId: string;
    timestamp: string;
  }) => void
) => {
  if (socket) {
    socket.on("procesoCerrado", callback);
  }
};

export const offProcesoCerrado = () => {
  if (socket) {
    socket.off("procesoCerrado");
  }
};

export const onMetaInboxMessageNew = (callback: (data: Record<string, unknown>) => void) => {
  if (socket) {
    socket.on("metaInboxMessageNew", callback);
  }
};

export const offMetaInboxMessageNew = () => {
  if (socket) {
    socket.off("metaInboxMessageNew");
  }
};

export const onMetaInboxThreadUpsert = (callback: (data: Record<string, unknown>) => void) => {
  if (socket) {
    socket.on("metaInboxThreadUpsert", callback);
  }
};

export const offMetaInboxThreadUpsert = () => {
  if (socket) {
    socket.off("metaInboxThreadUpsert");
  }
};

export const getSocket = (): Socket | null => socket;
