import { useEffect, useRef, useState } from "react";
import { fetchShortcuts } from "@/services/shortcut.service";
import type { Shortcut } from "@/types/shortcut";

export function useComposer() {
  const [draft, setDraft] = useState("");
  const [pendingMedia, setPendingMedia] = useState<File | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [showRespuestasPanel, setShowRespuestasPanel] = useState(false);
  const [respuestasList, setRespuestasList] = useState<Shortcut[]>([]);
  const [slashSuggestions, setSlashSuggestions] = useState<Shortcut[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchShortcuts().then(setRespuestasList).catch(() => {});
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, 128);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > 128 ? "auto" : "hidden";
  }, [draft]);

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (value.startsWith("/") && !value.includes(" ")) {
      const query = value.toLowerCase();
      setSlashSuggestions(respuestasList.filter((r) => r.atajo.toLowerCase().startsWith(query)));
    } else {
      setSlashSuggestions([]);
    }
  };

  const applyRespuesta = (texto: string) => {
    setDraft(texto);
    setSlashSuggestions([]);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const clearDraft = () => {
    setDraft("");
    setSlashSuggestions([]);
  };

  return {
    draft,
    pendingMedia,
    setPendingMedia,
    showRecorder,
    setShowRecorder,
    showRespuestasPanel,
    setShowRespuestasPanel,
    slashSuggestions,
    textareaRef,
    handleDraftChange,
    applyRespuesta,
    clearDraft,
  };
}
