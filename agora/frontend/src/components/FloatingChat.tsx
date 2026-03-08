import React, { useState, useRef, useEffect } from "react";
import { ImageIcon, Plus, Send, FileTextIcon, X, User, Zap, Lock } from "lucide-react";
import { getSocket } from "../services/socket";
import VoiceRecorder from "./VoiceRecorder";
import { estilos } from "../theme/estilos";
import { Tooltip } from "./Tooltip";
import { manejarEnvioArchivo } from "../utils/archivo";
import RespuestasRapidasView from "./RespuestasRapidasView";
import type { RespuestaRapida } from '../types/respuestas-rapidas';
import { fetchRespuestas } from "../services/respuestas-rapidas.service";
import { formatMessageTime, agruparMensajesPorDia } from "../utils/formatTimestamp";
import { normalizeMediaUrl } from "../utils/mediaUrl";

interface FloatingChatProps {
  clienteId: string;
  procesoId: string;
  tipoId: string;
  onClose: () => void;
  modoExpandido?: boolean;
  onNextCliente?: () => void;
  onPrevCliente?: () => void;
  setPanelActivo: (panel: "cliente" | "scraping" | "cierre" | null) => void;
}

interface Mensaje {
  contenido: string;
  direccion_mensaje: string;
  fecha_envio: string;
  tipo?: string;
  url_archivo?: string;
}

interface Proceso {
  conversaciones: Array<{
    contenido?: string | null;
    direccion?: string | null;
    fecha_envio?: string | null;
    tipo?: string | null;
    url_archivo?: string | null;
  }>;
}

interface SocketData {
  clienteId: string;
  direccion_mensaje: string;
  contenido: string | { text: string } | null;
  fecha_envio: string;
  tipo?: string;
  url_archivo?: string;
}

function esAudioPorUrl(url?: string | null) {
  if (!url) return false;
  return /\.(ogg|mp3|wav|m4a|aac|opus)$/i.test(url);
}

function esImagenPorUrl(url?: string | null) {
  if (!url) return false;
  return /\.(png|jpe?g|gif|webp)$/i.test(url);
}

const FloatingChat: React.FC<FloatingChatProps> = ({
  clienteId,
  procesoId,
  tipoId,
  onClose,
  modoExpandido = true,
  onNextCliente,
  onPrevCliente,
  setPanelActivo,
}) => {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [archivoAdjunto, setArchivoAdjunto] = useState<File | null>(null);
  const [tipoArchivo, setTipoArchivo] = useState<"imagen" | "documento" | "audio" | null>(null);
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [respuestasRapidasVisible, setRespuestasRapidasVisible] = useState(false);
  const [respuestasRapidas, setRespuestasRapidas] = useState<RespuestaRapida[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${import.meta.env.VITE_API_URL}/mongo/procesos/cliente/${clienteId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const procesos = Array.isArray(data) ? data : [data];

        const todasConversaciones = procesos.flatMap((proceso: Proceso) =>
          (proceso.conversaciones ?? [])
            // ✅ filtra objetos vacíos / inválidos
            .filter((msg) => {
              if (!msg) return false;
              const tieneFecha = !!msg.fecha_envio;
              const tieneAlgo = !!(msg.contenido || msg.url_archivo);
              return tieneFecha && tieneAlgo;
            })
            .map((msg) => ({
              contenido: (msg.contenido ?? "") as string,
              direccion_mensaje: msg.direccion === "input" ? "input" : "output",
              fecha_envio: (msg.fecha_envio ?? "") as string,
              tipo: (msg.tipo ?? undefined) as string | undefined,
              url_archivo: normalizeMediaUrl((msg.url_archivo ?? undefined) as string | undefined),
            }))
        );

        todasConversaciones.sort(
          (a, b) => new Date(a.fecha_envio).getTime() - new Date(b.fecha_envio).getTime()
        );

        setMensajes(todasConversaciones);
        setCargando(false);
      })
      .catch((err) => {
        console.error("❌ Error cargando procesos:", err);
        setCargando(false);
      });
  }, [clienteId]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensajes]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const unirseSala = () => {
      socket.emit("joinRoom", clienteId);
      console.log("📥 Panel se unió a sala:", clienteId);
    };

    if (socket.connected) {
      unirseSala();
    } else {
      socket.once("connect", unirseSala);
    }

    const handler = (data: SocketData) => {
      if (data.clienteId !== clienteId) return;

      // ⚠️ no descartamos outputs sin tipo, porque podrían venir con texto puro
      const contenidoNormalizado =
        typeof data.contenido === "string"
          ? data.contenido
          : data.contenido?.text ?? (data.contenido ? JSON.stringify(data.contenido) : "");

      // ✅ si viene totalmente vacío, no agregamos
      const tieneAlgo = !!(contenidoNormalizado || data.url_archivo);
      if (!tieneAlgo) return;

      setMensajes((prev) => [
        ...prev,
        {
          contenido: contenidoNormalizado,
          direccion_mensaje: data.direccion_mensaje === "input" ? "input" : "output",
          fecha_envio: data.fecha_envio,
          tipo: data.tipo,
          url_archivo: normalizeMediaUrl(data.url_archivo),
        },
      ]);
    };

    socket.on("nuevoMensaje", handler);
    return () => {
      socket.off("nuevoMensaje", handler);
    };
  }, [clienteId]);

  useEffect(() => {
    fetchRespuestas().then(setRespuestasRapidas).catch(() => setRespuestasRapidas([]));
  }, []);

  const enviarMensajeManual = async () => {
    const token = localStorage.getItem("token");
    const usuario = localStorage.getItem("username") || "obeltran";
    if (!token) return;
    if (!nuevoMensaje.trim() && !archivoAdjunto) return;

    try {
      if (!procesoId) throw new Error("procesoId no fue recibido correctamente como prop");

      if (tipoArchivo === "audio" && archivoAdjunto) {
        const formData = new FormData();
        formData.append("archivo", archivoAdjunto);
        formData.append("usuario", usuario);
        formData.append("tipoId", tipoId);

        const res = await fetch(`${import.meta.env.VITE_API_URL}/procesos-pg/${procesoId}/nota-voz`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!res.ok) throw new Error("Error al enviar nota de voz");
      } else if (archivoAdjunto) {
        await manejarEnvioArchivo(archivoAdjunto, procesoId, usuario, token, tipoId);
      } else if (nuevoMensaje.trim()) {
        const formData = new FormData();
        formData.append("tipo", "texto");
        formData.append("contenido", nuevoMensaje.trim());
        formData.append("usuario", usuario);
        formData.append("tipoId", tipoId);

        const res = await fetch(`${import.meta.env.VITE_API_URL}/procesos-pg/${procesoId}/mensaje`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Error al enviar texto: ${err}`);
        }
      }

      setNuevoMensaje("");
      setArchivoAdjunto(null);
      setTipoArchivo(null);
      setAudioURL(null);
    } catch (error) {
      console.error("❌ Error al enviar mensaje:", error);
    }
  };

  const handleAudioReady = (audioFile: File, url: string) => {
    setArchivoAdjunto(audioFile);
    setTipoArchivo("audio");
    setAudioURL(url);
  };

  const handleSendRespuestaRapida = (texto: string) => {
    setNuevoMensaje(texto);
    setRespuestasRapidasVisible(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    const encontrada = respuestasRapidas.find(r => r.atajo.trim() === value.trim());
    if (encontrada) {
      setNuevoMensaje(encontrada.texto);
    } else {
      setNuevoMensaje(value);
    }
  };

  return (
    <div className={modoExpandido ? estilos.chatExpandido.ventanaChat : estilos.floatingChat.contenedor}>
      {modoExpandido ? (
        <div className={estilos.chatExpandido.encabezadoChat}>
          <span>Chat: {clienteId}</span>
          <div className="flex items-center gap-2">
            <button onClick={onPrevCliente} className="text-textoOscuro hover:text-azulPrimario text-lg">←</button>
            <button onClick={onNextCliente} className="text-textoOscuro hover:text-azulPrimario text-lg">→</button>
            <Tooltip label="Datos del cliente">
              <button onClick={() => setPanelActivo("cliente")}>
                <User size={20} />
              </button>
            </Tooltip>
            <Tooltip label="Scraping MovistarClick">
              <button onClick={() => setPanelActivo("scraping")}>
                <Zap size={20} />
              </button>
            </Tooltip>
            <Tooltip label="Cerrar proceso">
              <button onClick={() => setPanelActivo("cierre")}>
                <Lock size={20} />
              </button>
            </Tooltip>
            <Tooltip label="Cerrar chat">
              <button onClick={onClose} className="text-textoOscuro hover:text-azulPrimario">
                <X />
              </button>
            </Tooltip>
          </div>
        </div>
      ) : (
        <div className={estilos.floatingChat.encabezado}>
          <span className={estilos.floatingChat.encabezadoTitulo}>Chat: {clienteId}</span>
          <button onClick={onClose} className={estilos.floatingChat.cerrarBoton}><X /></button>
        </div>
      )}

      <div className={modoExpandido ? estilos.chatExpandido.areaMensajes : estilos.floatingChat.areaMensajes}>
        {cargando ? (
          <p className={estilos.floatingChat.cargandoTexto}>Cargando conversación...</p>
        ) : mensajes.length === 0 ? (
          <p className={estilos.floatingChat.sinMensajes}>Sin mensajes recientes.</p>
        ) : (
          agruparMensajesPorDia(mensajes).map((grupo, gIdx) => (
            <div key={gIdx}>
              <div className="flex items-center justify-center my-4">
                <div className="bg-fondoCard text-textoOscuro text-xs px-3 py-1 rounded-full shadow-sm">
                  {grupo.separator}
                </div>
              </div>

              {grupo.mensajes.map((msg, idx) => {
                const tipo = (msg.tipo || "").toLowerCase();
                const esAudio = tipo === "audio" || esAudioPorUrl(msg.url_archivo);
                const esImagen = tipo === "imagen" || esImagenPorUrl(msg.url_archivo);

                const texto = (msg.contenido || "").trim();
                const mostrarTexto = texto.length > 0 && texto !== "[audio]";

                return (
                  <div key={idx} className={`flex mb-2 ${msg.direccion_mensaje === "input" ? "justify-start" : "justify-end"}`}>
                    <div className={msg.direccion_mensaje === "input" ? estilos.floatingChat.mensajeCliente : estilos.floatingChat.mensajeAgente}>

                      {/* ✅ Archivo primero (si existe) */}
                      {msg.url_archivo && esImagen && (
                        <img
                          src={msg.url_archivo}
                          alt="imagen"
                          className={estilos.floatingChat.adjuntoPreview}
                        />
                      )}

                      {msg.url_archivo && esAudio && (
                        <audio controls className="w-full mt-1" src={msg.url_archivo}>
                          Tu navegador no soporta audio.
                        </audio>
                      )}

                      {msg.url_archivo && tipo === "video" && (
                        <video controls className={estilos.floatingChat.adjuntoPreview}>
                          <source src={msg.url_archivo} type="video/mp4" />
                          Tu navegador no soporta video.
                        </video>
                      )}

                      {msg.url_archivo && tipo === "documento" && (
                        <a href={msg.url_archivo} target="_blank" rel="noopener noreferrer" className="underline text-sm">
                          Descargar documento
                        </a>
                      )}

                      {/* ✅ Texto independiente (para permitir imagen+texto) */}
                      {mostrarTexto && (
                        <div className="mt-1 whitespace-pre-wrap">
                          {texto}
                        </div>
                      )}

                      <div className={estilos.floatingChat.timestamp}>
                        {formatMessageTime(msg.fecha_envio)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      <div className={modoExpandido ? estilos.chatExpandido.entradaMensaje : estilos.floatingChat.barraInferior}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMostrarOpciones(!mostrarOpciones)}
            className={estilos.floatingChat.botonAdjuntos}
          >
            <Plus className={estilos.floatingChat.icono} />
          </button>
          <button
            type="button"
            onClick={() => setRespuestasRapidasVisible(!respuestasRapidasVisible)}
            className={`${estilos.floatingChat.botonAdjuntos} ml-2`}
            title="Respuestas rápidas"
          >
            <Zap className={estilos.floatingChat.icono} />
          </button>
          {mostrarOpciones && (
            <div className={estilos.floatingChat.menuAdjuntos}>
              <label htmlFor="input-imagen">
                <ImageIcon className={`${estilos.floatingChat.icono} text-azulPrimario cursor-pointer`} />
              </label>
              <input
                id="input-imagen"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const archivo = e.target.files?.[0];
                  if (archivo) {
                    setArchivoAdjunto(archivo);
                    setTipoArchivo("imagen");
                  }
                }}
              />
              <label htmlFor="input-doc">
                <FileTextIcon className={`${estilos.floatingChat.icono} text-textoOscuro cursor-pointer`} />
              </label>
              <input
                id="input-doc"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const archivo = e.target.files?.[0];
                  if (archivo) {
                    setArchivoAdjunto(archivo);
                    setTipoArchivo("documento");
                  }
                }}
              />
              <VoiceRecorder onAudioReady={handleAudioReady} />
            </div>
          )}
        </div>
        <input
          type="text"
          value={nuevoMensaje}
          onChange={handleInputChange}
          placeholder="Mensaje..."
          className={modoExpandido ? estilos.chatExpandido.inputMensaje : estilos.floatingChat.inputMensaje}
        />
        <button
          type="button"
          onClick={enviarMensajeManual}
          className={modoExpandido ? estilos.chatExpandido.botonEnviar : estilos.floatingChat.botonEnviar}
          disabled={!nuevoMensaje.trim() && !archivoAdjunto}
        >
          <Send className={estilos.floatingChat.iconoMini} />
        </button>
      </div>

      {respuestasRapidasVisible && (
        <RespuestasRapidasView onClose={() => setRespuestasRapidasVisible(false)} onSend={handleSendRespuestaRapida} />
      )}
    </div>
  );
};

export default FloatingChat;
