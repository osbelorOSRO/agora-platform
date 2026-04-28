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

    // 📌 Unión explícita a una sala operativa.
    socket.on("joinRoom", (room: string) => {
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
    socket.on("conectar_usuario", ({ usuario_id, rol }) => {
      if (!usuario_id) {
        console.warn("⚠️ Datos faltantes en conectar_usuario");
        return;
      }

      joinUserRoom(usuario_id, rol);
    });

    // 💬 Evento de sala directa por actor externo.
    socket.on("nuevoMensaje", (data: NuevoMensajePayload) => {
      io.to(data.actorExternalId).emit("nuevoMensaje", data);
      console.log(`💬 Emitido nuevoMensaje a sala ${data.actorExternalId}`);
    });


    // 📡 Emisión general de evento
    socket.on("emitir_evento_custom", (data: unknown) => {
      console.log("📤 Evento recibido:", data);
      io.emit("evento_broadcast", data);
    });

socket.on("emitirGlobito", (data: MensajeGlobitoPayload) => {
  const sala = `usuario_${data.usuario_id}`;
  io.to(sala).emit("nuevoMensajeGlobito", data);
  console.log(`📣 Emitido nuevoMensajeGlobito a sala ${sala}`, data);
});


    // 🤖 El bot puede enviar mensajes a cualquier sala (cliente o usuario)
    socket.on("mensaje_entrante", ({ sala, contenido }) => {
      if (!sala || !contenido) {
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
