import { io, type Socket } from "socket.io-client";
import { storage } from "@/lib/storage";
import { env } from "@/lib/env";

let waDashboardSocket: Socket | null = null;

export const getWaDashboardUrl = () => env.waPublicUrl;

export const getWaDashboardSocket = (): Socket | null => {
  const waUrl = getWaDashboardUrl();

  if (!waUrl) return null;

  if (!waDashboardSocket) {
    waDashboardSocket = io(waUrl, {
      autoConnect: false,
      auth: {
        token: storage.getToken(),
      },
      transports: ["websocket", "polling"],
    });
  }

  return waDashboardSocket;
};

export const ensureWaDashboardConnected = (socket: Socket | null): void => {
  if (!socket) return;
  if (!socket.connected) {
    socket.connect();
  }
};

export const connectWaDashboardSocket = (): Socket | null => {
  const socket = getWaDashboardSocket();
  ensureWaDashboardConnected(socket);

  return socket;
};

export const disconnectWaDashboardSocket = (): void => {
  if (!waDashboardSocket) return;
  waDashboardSocket.disconnect();
};
