import { useEffect, useMemo, useState } from "react";
import {
  disconnectWaDashboardSocket,
  ensureWaDashboardConnected,
  getWaDashboardSocket,
} from "../services/waDashboard.service";

type WaEstado = {
  conexion?: string;
  numero?: string | null;
  ultimaConexion?: string | null;
  connectedSince?: string | null;
  connectedDurationMs?: number;
  ultimoMensaje?: string | null;
};

type WaStats = {
  mensajesRecibidos?: number;
  mensajesEnviados?: number;
  uptime?: number;
  ultimoMensaje?: string | null;
};

type WaConfig = {
  readReceipts?: boolean;
  showOnline?: boolean;
  blocks?: string[];
};

export type WaDashboardLog = {
  id: string;
  type: "info" | "success" | "warning" | "error";
  message: string;
  timestamp: string;
};

export type WaSocketPhase =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

const makeLog = (
  message: string,
  type: WaDashboardLog["type"] = "info"
): WaDashboardLog => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  message,
  type,
  timestamp: new Date().toISOString(),
});

export function useWaDashboard() {
  const [estado, setEstado] = useState<WaEstado | null>(null);
  const [stats, setStats] = useState<WaStats | null>(null);
  const [config, setConfig] = useState<WaConfig | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<{ status: string; message: string } | null>(null);
  const [logs, setLogs] = useState<WaDashboardLog[]>([]);
  const [connected, setConnected] = useState(false);
  const [available, setAvailable] = useState(true);
  const [socketPhase, setSocketPhase] = useState<WaSocketPhase>("idle");
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  useEffect(() => {
    const socket = getWaDashboardSocket();

    if (!socket) {
      setAvailable(false);
      return;
    }

    setAvailable(true);

    const addLog = (message: string, type: WaDashboardLog["type"] = "info") => {
      setLogs((prev) => [makeLog(message, type), ...prev].slice(0, 24));
    };

    const onConnect = () => {
      setConnected(true);
      setSocketPhase("connected");
      setReconnectAttempt(0);
      socket.emit("getStats");
      socket.emit("getEstado");
      addLog("Conexion al panel WA establecida", "success");
    };

    const onDisconnect = (reason?: string) => {
      setConnected(false);
      setSocketPhase(reason === "io client disconnect" ? "disconnected" : "reconnecting");
      addLog("Conexion al panel WA cerrada", "warning");
    };

    const onConnectError = (error: unknown) => {
      setConnected(false);
      setSocketPhase("reconnecting");
      addLog(`Error de conexion socket WA: ${(error as any)?.message ?? "desconocido"}`, "warning");
    };

    const onEstado = (payload: WaEstado) => {
      setEstado(payload);
      setLastSyncAt(new Date().toISOString());
    };

    const onStats = (payload: WaStats) => {
      setStats(payload);
      setLastSyncAt(new Date().toISOString());
    };

    const onConfig = (payload: WaConfig) => {
      setConfig(payload);
    };

    const onQrImage = (payload: string) => {
      setQrImage(payload);
      addLog("QR de vinculacion actualizado", "success");
    };

    const onQrStatus = (payload: { status: string; message: string }) => {
      setQrStatus(payload);
      addLog(payload.message, payload.status === "error" ? "error" : payload.status === "success" ? "success" : "info");
    };

    const onBloqueado = (payload: { numero: string; success: boolean; error?: string }) => {
      addLog(
        payload.success ? `Numero bloqueado: ${payload.numero}` : payload.error || `No se pudo bloquear ${payload.numero}`,
        payload.success ? "success" : "error"
      );
    };

    const onDesbloqueado = (payload: { numero: string; success: boolean; error?: string }) => {
      addLog(
        payload.success
          ? `Numero desbloqueado: ${payload.numero}`
          : payload.error || `No se pudo desbloquear ${payload.numero}`,
        payload.success ? "success" : "error"
      );
    };

    const manager = socket.io;
    const onReconnectAttempt = (attempt: number) => {
      setReconnectAttempt(attempt);
      setSocketPhase("reconnecting");
    };
    const onReconnect = () => {
      setReconnectAttempt(0);
      setSocketPhase("connected");
    };
    const onReconnectError = () => {
      setSocketPhase("reconnecting");
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("estadoCompleto", onEstado);
    socket.on("stats", onStats);
    socket.on("config", onConfig);
    socket.on("qrImage", onQrImage);
    socket.on("qrStatus", onQrStatus);
    socket.on("bloqueado", onBloqueado);
    socket.on("desbloqueado", onDesbloqueado);

    manager.on("reconnect_attempt", onReconnectAttempt);
    manager.on("reconnect", onReconnect);
    manager.on("reconnect_error", onReconnectError);

    // Conectamos después de registrar listeners para no perder `estadoCompleto`.
    setSocketPhase("connecting");
    ensureWaDashboardConnected(socket);

    if (socket.connected) {
      onConnect();
    }

    const interval = window.setInterval(() => {
      socket.emit("getStats");
      socket.emit("getEstado");
    }, 10000);

    return () => {
      window.clearInterval(interval);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("estadoCompleto", onEstado);
      socket.off("stats", onStats);
      socket.off("config", onConfig);
      socket.off("qrImage", onQrImage);
      socket.off("qrStatus", onQrStatus);
      socket.off("bloqueado", onBloqueado);
      socket.off("desbloqueado", onDesbloqueado);
      manager.off("reconnect_attempt", onReconnectAttempt);
      manager.off("reconnect", onReconnect);
      manager.off("reconnect_error", onReconnectError);
      // Forzamos reconexión al volver al módulo para asegurar `estadoCompleto` inicial.
      disconnectWaDashboardSocket();
    };
  }, []);

  const acciones = useMemo(() => {
    return {
      generarQr: () => {
        const socket = getWaDashboardSocket();
        ensureWaDashboardConnected(socket);
        socket?.emit("generateQR");
      },
      reiniciar: () => {
        const socket = getWaDashboardSocket();
        ensureWaDashboardConnected(socket);
        socket?.emit("restart");
      },
      cerrarSesion: () => {
        const socket = getWaDashboardSocket();
        ensureWaDashboardConnected(socket);
        socket?.emit("logout");
      },
      bloquear: (numero: string) => {
        const socket = getWaDashboardSocket();
        ensureWaDashboardConnected(socket);
        socket?.emit("bloquear", numero);
      },
      desbloquear: (numero: string) => {
        const socket = getWaDashboardSocket();
        ensureWaDashboardConnected(socket);
        socket?.emit("desbloquear", numero);
      },
      refrescarStats: () => {
        const socket = getWaDashboardSocket();
        ensureWaDashboardConnected(socket);
        socket?.emit("getStats");
        socket?.emit("getEstado");
      },
    };
  }, []);

  return {
    estado,
    stats,
    config,
    qrImage,
    qrStatus,
    logs,
    connected,
    available,
    socketPhase,
    reconnectAttempt,
    lastSyncAt,
    ...acciones,
  };
}
