import React, { useEffect, useState } from "react";
import { connectSocket, getSocket } from "../services/socket";
import { useLocation } from "react-router-dom";

const ChatWindow = () => {
  const [mensajes, setMensajes] = useState<string[]>([]);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const token = localStorage.getItem("token") || "";
  const clienteId = searchParams.get("clienteId") || "";

  useEffect(() => {
    connectSocket(token);

    const socket = getSocket();
    if (!socket) return;

    socket.emit("joinRoom", clienteId);

    socket.on("nuevoMensaje", (data) => {
      setMensajes((prev) => [...prev, data.mensaje]);
    });

    return () => {
      socket.off("nuevoMensaje");
      socket.disconnect();
    };
  }, [clienteId]);

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-2">Chat con {clienteId}</h2>
      <div className="bg-white rounded shadow p-4 h-96 overflow-y-auto space-y-2">
        {mensajes.map((msg, i) => (
          <div key={i} className="bg-gray-100 p-2 rounded">{msg}</div>
        ))}
      </div>
    </div>
  );
};

export default ChatWindow;
