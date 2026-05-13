import { Server, Socket } from "socket.io";
import { verifyTokenBot, verifyTokenHuman } from "./tokenVerifier.js";

interface DecodedToken {
  id: number | string;
  username?: string;
  rol?: string;
  [key: string]: any;
}

interface NuevoMensajePayload {
  actorExternalId: string;
  phone?: string;
  mensaje: string;
  contenido?: string;
}

interface MensajeGlobitoPayload {
  usuario_id: number;
  actorExternalId: string;
  phone?: string;
  contenido: string;
  fecha_envio: string;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isSafeRoom = (room: string): boolean =>
  /^(usuario_[A-Za-z0-9_-]+|[A-Za-z0-9:_-]{1,255})$/.test(room);

function makeThrottle(maxCalls: number, windowMs: number): () => boolean {
  const timestamps: number[] = [];
  return function (): boolean {
    const now = Date.now();
    while (timestamps.length > 0 && timestamps[0] < now - windowMs) timestamps.shift();
    if (timestamps.length >= maxCalls) return false;
    timestamps.push(now);
    return true;
  };
}

// Estado de conexión del bot
let estadoBot = false;

export const getEstadoBot = () => estadoBot;
export const setEstadoBot = (estado: boolean) => {
  estadoBot = estado;
};

export const handleSocketConnection = async (socket: Socket, io: Server): Promise<void> => {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      socket.emit("error", "Token no enviado");
      socket.disconnect();
      return;
    }

    // Decodificamos el payload para decidir qué verificador usar
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

    let decoded: DecodedToken;
    const esBot = payload?.rol === "automate" && payload?.username === "baileysbot";

    if (esBot) {
      decoded = (await verifyTokenBot(token)) as DecodedToken;
      console.log("🤖 Bot conectado al WebSocket");
      setEstadoBot(true);
    } else {
      decoded = (await verifyTokenHuman(token)) as DecodedToken;
      console.log(`🔐 Conexión autorizada: usuario ${decoded.id}`);
    }

    socket.emit("conexion_autorizada", { usuario_id: decoded.id });
    const ownUserRoom = `usuario_${decoded.id}`;

    const throttleSetup = makeThrottle(5, 60 * 1000);    // joinRoom/conectar_usuario: 5 por min
    const throttleGlobito = makeThrottle(30, 60 * 1000); // emitirGlobito: 30 por min

    // 📌 Unión explícita a una sala operativa.
    socket.on("joinRoom", (room: string) => {
      if (!throttleSetup()) {
        socket.emit("error", "Demasiadas solicitudes");
        return;
      }
      if (!isNonEmptyString(room) || !isSafeRoom(room)) {
        socket.emit("error", "Sala inválida");
        return;
      }

      if (!esBot && room !== ownUserRoom) {
        socket.emit("error", "No autorizado para unirse a esa sala");
        return;
      }

      socket.join(room);
      console.log(`📌 Socket unido a sala: ${room}`);
    });

    const joinUserRoom = (usuarioId: number | string, rol?: string) => {
      const sala = `usuario_${usuarioId}`;
      socket.join(sala);
      const roleSuffix = rol ? ` con rol ${rol}` : "";
      console.log(`✅ Usuario unido a sala ${sala}${roleSuffix}`);
    };

    // 👤 El frontend también se une a su propia sala de usuario
    socket.on("conectar_usuario", ({ usuario_id, rol } = {}) => {
      if (!throttleSetup()) {
        socket.emit("error", "Demasiadas solicitudes");
        return;
      }
      if (!usuario_id) {
        socket.emit("error", "usuario_id requerido");
        return;
      }

      if (!esBot && String(usuario_id) !== String(decoded.id)) {
        socket.emit("error", "No autorizado para esa sala de usuario");
        return;
      }

      joinUserRoom(esBot ? usuario_id : decoded.id, rol);
    });

    // 💬 Evento de sala directa por actor externo.
    socket.on("nuevoMensaje", (data: NuevoMensajePayload) => {
      if (!esBot) {
        socket.emit("error", "Evento no autorizado");
        return;
      }

      if (!isNonEmptyString(data?.actorExternalId)) {
        socket.emit("error", "actorExternalId requerido");
        return;
      }

      io.to(data.actorExternalId).emit("nuevoMensaje", data);
      console.log(`💬 Emitido nuevoMensaje a sala ${data.actorExternalId}`);
    });


    // 📡 Emisión general de evento
    socket.on("emitir_evento_custom", (data: unknown) => {
      if (!esBot) {
        socket.emit("error", "Evento no autorizado");
        return;
      }

      console.log("📤 Evento recibido:", data);
      io.emit("evento_broadcast", data);
    });

    socket.on("emitirGlobito", (data: MensajeGlobitoPayload) => {
      if (!esBot && !throttleGlobito()) {
        socket.emit("error", "Demasiadas solicitudes");
        return;
      }
      if (!data?.usuario_id) {
        socket.emit("error", "usuario_id requerido");
        return;
      }

      if (!esBot && String(data.usuario_id) !== String(decoded.id)) {
        socket.emit("error", "Evento no autorizado");
        return;
      }

      const sala = `usuario_${data.usuario_id}`;
      io.to(sala).emit("nuevoMensajeGlobito", data);
      console.log(`📣 Emitido nuevoMensajeGlobito a sala ${sala}`, data);
    });


    // 🤖 El bot puede enviar mensajes a cualquier sala (cliente o usuario)
    socket.on("mensaje_entrante", ({ sala, contenido }) => {
      if (!esBot) {
        socket.emit("error", "Evento no autorizado");
        return;
      }

      if (!isNonEmptyString(sala) || !isSafeRoom(sala) || !contenido) {
        console.warn("⚠️ mensaje_entrante recibido sin datos válidos");
        return;
      }

      io.to(sala).emit("mensaje_para_agente", contenido);
      console.log(`📨 Mensaje emitido a sala ${sala}:`, contenido);
    });

    // 🔌 Desconexión
    socket.on("disconnect", () => {
      console.log(`🔴 Socket desconectado: ${socket.id}`);

      if (esBot) {
        setEstadoBot(false);
        console.log("⚠️ Bot marcado como desconectado");
      }
    });
  } catch (err) {
    console.error("❌ Error al verificar token:", err);
    socket.emit("error", "Token inválido");
    socket.disconnect();
  }
};
