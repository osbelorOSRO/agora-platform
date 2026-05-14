import React, { useEffect, useRef, useState } from "react";
import { MicIcon, Trash2, Send, Square } from "lucide-react";
import { estilos } from "../theme/estilos";

interface VoiceRecorderProps {
  onAudioReady: (archivo: File, url: string) => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onAudioReady }) => {
  const [grabando, setGrabando] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);
  const intervaloRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (grabando) {
      setSegundos(0);
      intervaloRef.current = setInterval(() => {
        setSegundos((prev) => prev + 1);
      }, 1000);
    } else if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
    }

    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, [grabando]);

  const getUserMediaSafe = async (): Promise<MediaStream> => {
    if (navigator.mediaDevices?.getUserMedia) {
      return navigator.mediaDevices.getUserMedia({ audio: true });
    }

    const legacyGetUserMedia =
      (navigator as any).getUserMedia ||
      (navigator as any).webkitGetUserMedia ||
      (navigator as any).mozGetUserMedia ||
      (navigator as any).msGetUserMedia;

    if (legacyGetUserMedia) {
      return new Promise((resolve, reject) => {
        legacyGetUserMedia.call(navigator, { audio: true }, resolve, reject);
      });
    }

    throw new Error(
      window.isSecureContext
        ? "Tu navegador no soporta grabación de audio."
        : "Micrófono bloqueado: abre el panel en HTTPS o localhost para grabar audio."
    );
  };

  const iniciarGrabacion = async () => {
    try {
      setErrorMsg(null);
      const micStream = await getUserMediaSafe();

      // Deja que el navegador elija el tipo soportado
      const recorder = new MediaRecorder(micStream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mime = chunks[0]?.type || "audio/webm";
        const blob = new Blob(chunks, { type: mime });
        console.log("BLOB SIZE", blob.size, "TYPE", blob.type);

        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioURL(url);
        setGrabando(false);
        micStream.getTracks().forEach((track) => track.stop());
        setStream(null);
      };

      recorder.start(); // sin timeslice
      setMediaRecorder(recorder);
      setStream(micStream);
      setGrabando(true);
    } catch (err) {
      console.error("❌ Error al acceder al micrófono:", err);
      const message = err instanceof Error ? err.message : "No se pudo acceder al micrófono.";
      setErrorMsg(message);
      fallbackInputRef.current?.click();
    }
  };

  const cancelarGrabacion = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setAudioBlob(null);
    setAudioURL(null);
    setGrabando(false);
  };

  const confirmarAudio = () => {
    if (!audioBlob || !audioURL) return;

    console.log("CONFIRMAR AUDIO", audioBlob.size, audioBlob.type);

    const archivo = new File(
      [audioBlob],
      `nota_voz_${Date.now()}.webm`,
      { type: audioBlob.type || "audio/webm" }
    );

    onAudioReady(archivo, audioURL);

    setAudioBlob(null);
    setAudioURL(null);
    setErrorMsg(null);
  };

  const handleAudioFileFallback = (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    onAudioReady(file, url);
    setErrorMsg(null);
  };

  return (
    <div className={estilos.voiceRecorder.contenedor}>
      {grabando ? (
        <div className={estilos.voiceRecorder.grabando}>
          <span className={estilos.voiceRecorder.pulsando}>🎙️ {segundos}s</span>
          <button
            onClick={() => mediaRecorder?.stop()}
            className={estilos.voiceRecorder.detener}
          >
            <Square className={estilos.voiceRecorder.iconoMini} />
          </button>
        </div>
      ) : audioURL ? (
        <div className={estilos.voiceRecorder.previsualizacion}>
          <audio src={audioURL} controls className={estilos.voiceRecorder.audio}>
            {/* el navegador usará el type del blob */}
          </audio>
          <button onClick={confirmarAudio} className={estilos.voiceRecorder.btnEnviar}>
            <Send className={estilos.voiceRecorder.iconoMini} />
          </button>
          <button onClick={cancelarGrabacion} className={estilos.voiceRecorder.btnCancelar}>
            <Trash2 className={estilos.voiceRecorder.iconoMini} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <button onClick={iniciarGrabacion} className={estilos.voiceRecorder.btnMic} title="Grabar audio">
            <MicIcon className={estilos.voiceRecorder.icono} />
          </button>
          <input
            ref={fallbackInputRef}
            type="file"
            accept="audio/*"
            capture="user"
            className="hidden"
            onChange={(e) => {
              handleAudioFileFallback(e.target.files?.[0]);
              e.currentTarget.value = "";
            }}
          />
          {errorMsg && <p className="text-xs text-red-600 text-center max-w-[260px]">{errorMsg}</p>}
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
