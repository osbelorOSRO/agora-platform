import React from "react";
import { ImagePlus, Mic, Send, X, Zap } from "lucide-react";
import type { Shortcut } from "@/types/shortcut";
import VoiceRecorder from "@/components/VoiceRecorder";
import RespuestasRapidasView from "@/components/RespuestasRapidasView";
import { s } from "../styles";

interface Props {
  draft: string;
  pendingMedia: File | null;
  blocked: boolean;
  sending: boolean;
  showRecorder: boolean;
  showRespuestasPanel: boolean;
  slashSuggestions: Shortcut[];
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onSendMedia: (file: File) => void;
  onSetPendingMedia: (file: File | null) => void;
  onApplyRespuesta: (texto: string) => void;
  onToggleRecorder: () => void;
  onToggleRespuestas: () => void;
}

export const ComposerView: React.FC<Props> = ({
  draft,
  pendingMedia,
  blocked,
  sending,
  showRecorder,
  showRespuestasPanel,
  slashSuggestions,
  textareaRef,
  onDraftChange,
  onSend,
  onSendMedia,
  onSetPendingMedia,
  onApplyRespuesta,
  onToggleRecorder,
  onToggleRespuestas,
}) => {
  return (
    <>
      {pendingMedia && (
        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted px-3 py-2">
          <div className="min-w-0 text-sm text-foreground">
            <span className="font-bold">Imagen adjunta</span>
            <span className="ml-2 text-muted-foreground">{pendingMedia.name}</span>
          </div>
          <button
            type="button"
            onClick={() => onSetPendingMedia(null)}
            className={s.closeButton}
            aria-label="Quitar adjunto"
            title="Quitar adjunto"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {slashSuggestions.length > 0 && (
        <div className="mx-3 mb-1 rounded-xl border border-border bg-card overflow-hidden">
          {slashSuggestions.map((r) => (
            <button
              key={r.uuid}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onApplyRespuesta(r.texto);
              }}
              className="flex w-full items-start gap-3 px-3 py-2 text-left transition hover:bg-input"
            >
              <span className="mt-0.5 shrink-0 text-xs font-bold text-primary">{r.atajo}</span>
              <span className="min-w-0 truncate text-sm text-muted-foreground">{r.texto}</span>
            </button>
          ))}
        </div>
      )}

      <div className={`${s.composer} ${blocked ? "opacity-60" : ""}`}>
        <textarea
          ref={textareaRef}
          rows={1}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
            if (e.key === "Tab" && slashSuggestions.length > 0) {
              e.preventDefault();
              onApplyRespuesta(slashSuggestions[0].texto);
            }
          }}
          placeholder={
            blocked
              ? "Contacto bloqueado. Desbloquéalo para chatear."
              : pendingMedia
                ? "Escribe un texto para la imagen..."
                : "Escribe un mensaje..."
          }
          className={s.composerInput}
          disabled={blocked}
          aria-label="Mensaje"
        />
        <button
          type="button"
          onClick={onToggleRespuestas}
          className={`${s.composerSend} ${showRespuestasPanel ? "border-border-primary text-primary" : ""}`}
          aria-label="Respuestas rápidas"
          title="Respuestas rápidas"
        >
          <Zap className={s.composerIcon} />
        </button>
        <label
          className={`${s.composerSend} ${blocked ? "pointer-events-none" : "cursor-pointer"}`}
          aria-label="Adjuntar imagen"
          title="Adjuntar imagen"
        >
          <ImagePlus className={s.composerIcon} />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onSetPendingMedia(file);
              e.currentTarget.value = "";
            }}
          />
        </label>
        <button
          onClick={onToggleRecorder}
          className={s.composerSend}
          disabled={blocked}
          aria-label="Grabar audio"
          title="Grabar audio"
        >
          <Mic className={s.composerIcon} />
        </button>
        <button
          onClick={onSend}
          disabled={blocked || sending || (!draft.trim() && !pendingMedia)}
          className={s.composerSend}
          aria-label="Enviar mensaje"
          title="Enviar"
        >
          <Send className={s.composerIcon} />
        </button>
      </div>

      {showRespuestasPanel && (
        <RespuestasRapidasView
          onSend={(texto) => {
            onApplyRespuesta(texto);
            onToggleRespuestas();
          }}
          onClose={onToggleRespuestas}
        />
      )}
      {showRecorder && (
        <div className="px-3 pb-3 bg-background border-t border-border">
          <VoiceRecorder
            onAudioReady={(file) => {
              onToggleRecorder();
              onSendMedia(file);
            }}
          />
        </div>
      )}
    </>
  );
};
