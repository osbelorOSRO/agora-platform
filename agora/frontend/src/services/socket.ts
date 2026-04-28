// src/services/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const connectSocket = () => {
  if (socket) {
    if (!socket.connected && !socket.active) {
      socket.connect();
    }
    return;
  }

  const token = localStorage.getItem("token");

  if (!token) {
    console.warn("❌ No se encontró el token JWT en localStorage.");
    return;
  }

  socket = io(import.meta.env.VITE_WEBSOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
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

  socket.on("connect_error", (err) => {
    console.warn("⚠️ Error conectando WebSocket:", err.message);
  });

  socket.on("error", (err) => {
    console.error("🚨 Error en WebSocket:", err);
  });
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
