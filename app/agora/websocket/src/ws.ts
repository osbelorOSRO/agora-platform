import { Server } from "socket.io";

let ioInstance: Server | null = null;

export const setIOInstance = (io: Server): void => {
  ioInstance = io;
};

export const getIOInstance = (): Server => {
  if (!ioInstance) {
    throw new Error("❌ La instancia de Socket.IO no ha sido inicializada aún.");
  }
  return ioInstance;
};
