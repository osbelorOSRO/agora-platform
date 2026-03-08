import { Server, Socket } from "socket.io";
import { verifyTokenBot, verifyTokenHuman } from "./tokenVerifier.js";

interface DecodedToken {
  id: number | string;
  username?: string;
  rol?: string;
  [key: string]: any;
}

interface ClienteActualizadoPayload {
  clienteId: string;
  estado: string;
}

interface NuevoMensajePayload {
  clienteId: string;
  mensaje: string;
}

interface MensajeGlobitoPayload {
  usuario_id: number;
  clienteId: string;
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

    // 📌 El frontend se une a una sala específica para cada cliente
    socket.on("joinRoom", (clienteId: string) => {
      socket.join(clienteId);
      console.log(`📌 Socket unido a sala: ${clienteId}`);
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

    // Compatibilidad con clientes antiguos
    socket.on("unirseSalaUsuario", (usuario_id: number | string) => {
      if (!usuario_id) {
        console.warn("⚠️ Datos faltantes en unirseSalaUsuario");
        return;
      }

      joinUserRoom(usuario_id);
    });

    // 🔄 Evento emitido cuando se actualiza un cliente desde el panel
    socket.on("clienteActualizado", (data: ClienteActualizadoPayload) => {
      io.to(data.clienteId).emit("clienteActualizado", data);
      console.log(`♻️ Emitido clienteActualizado a sala ${data.clienteId}`);
    });

    // 💬 Evento cuando se manda un mensaje a un cliente
    socket.on("nuevoMensaje", (data: NuevoMensajePayload) => {
      io.to(data.clienteId).emit("nuevoMensaje", data);
      console.log(`💬 Emitido nuevoMensaje a sala ${data.clienteId}`);
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
