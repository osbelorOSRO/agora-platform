import { io, type Socket } from "socket.io-client";

let waDashboardSocket: Socket | null = null;

export const getWaDashboardUrl = () => import.meta.env.VITE_WA_PUBLIC_URL;

export const getWaDashboardSocket = (): Socket | null => {
  const waUrl = getWaDashboardUrl();

  if (!waUrl) return null;

  if (!waDashboardSocket) {
    waDashboardSocket = io(waUrl, {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }

  return waDashboardSocket;
};

export const connectWaDashboardSocket = (): Socket | null => {
  const socket = getWaDashboardSocket();
  if (!socket) return null;

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};
