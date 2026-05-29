import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ComposerView } from "@/modules/metaInbox/components/ComposerView";
import type { Shortcut } from "@/types/shortcut";

vi.mock("@/components/VoiceRecorder", () => ({
  default: ({ onAudioReady }: { onAudioReady: (f: File) => void }) => (
    <button onClick={() => onAudioReady(new File([""], "audio.ogg"))}>MockVoiceRecorder</button>
  ),
}));

vi.mock("@/components/RespuestasRapidasView", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="respuestas-panel">
      <button onClick={onClose}>CerrarRespuestas</button>
    </div>
  ),
}));

const noop = () => {};
const noopAsync = async () => {};

const defaultProps = {
  draft: "",
  pendingMedia: null,
  blocked: false,
  sending: false,
  showRecorder: false,
  showRespuestasPanel: false,
  slashSuggestions: [] as Shortcut[],
  textareaRef: { current: null },
  onDraftChange: noop,
  onSend: noop,
  onSendMedia: noop,
  onSetPendingMedia: noop,
  onApplyRespuesta: noop,
  onToggleRecorder: noop,
  onToggleRespuestas: noop,
};

describe("ComposerView", () => {
  it("renderiza el textarea", () => {
    render(<ComposerView {...defaultProps} />);
    expect(screen.getByRole("textbox", { name: "Mensaje" })).toBeInTheDocument();
  });

  it("muestra el placeholder por defecto", () => {
    render(<ComposerView {...defaultProps} />);
    expect(screen.getByPlaceholderText("Escribe un mensaje...")).toBeInTheDocument();
  });

  it("muestra placeholder de imagen cuando hay pendingMedia", () => {
    const file = new File([""], "foto.jpg", { type: "image/jpeg" });
    render(<ComposerView {...defaultProps} pendingMedia={file} />);
    expect(screen.getByPlaceholderText("Escribe un texto para la imagen...")).toBeInTheDocument();
  });

  it("muestra placeholder de bloqueado cuando blocked=true", () => {
    render(<ComposerView {...defaultProps} blocked={true} />);
    expect(
      screen.getByPlaceholderText("Contacto bloqueado. Desbloquéalo para chatear."),
    ).toBeInTheDocument();
  });

  it("muestra la sección de adjunto cuando hay pendingMedia", () => {
    const file = new File([""], "foto.jpg", { type: "image/jpeg" });
    render(<ComposerView {...defaultProps} pendingMedia={file} />);
    expect(screen.getByText("foto.jpg")).toBeInTheDocument();
    expect(screen.getByText("Imagen adjunta")).toBeInTheDocument();
  });

  it("oculta la sección de adjunto cuando pendingMedia es null", () => {
    render(<ComposerView {...defaultProps} pendingMedia={null} />);
    expect(screen.queryByText("Imagen adjunta")).not.toBeInTheDocument();
  });

  it("llama onSetPendingMedia(null) al hacer click en X del adjunto", () => {
    const onSetPendingMedia = vi.fn();
    const file = new File([""], "foto.jpg", { type: "image/jpeg" });
    render(
      <ComposerView {...defaultProps} pendingMedia={file} onSetPendingMedia={onSetPendingMedia} />,
    );
    fireEvent.click(screen.getByLabelText("Quitar adjunto"));
    expect(onSetPendingMedia).toHaveBeenCalledWith(null);
  });

  it("llama onDraftChange al escribir en el textarea", () => {
    const onDraftChange = vi.fn();
    render(<ComposerView {...defaultProps} onDraftChange={onDraftChange} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Mensaje" }), {
      target: { value: "hola mundo" },
    });
    expect(onDraftChange).toHaveBeenCalledWith("hola mundo");
  });

  it("llama onSend al presionar Enter sin Shift", () => {
    const onSend = vi.fn();
    render(<ComposerView {...defaultProps} onSend={onSend} />);
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Mensaje" }), {
      key: "Enter",
      shiftKey: false,
    });
    expect(onSend).toHaveBeenCalledOnce();
  });

  it("no llama onSend al presionar Shift+Enter", () => {
    const onSend = vi.fn();
    render(<ComposerView {...defaultProps} onSend={onSend} />);
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Mensaje" }), {
      key: "Enter",
      shiftKey: true,
    });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("llama onSend al hacer click en el botón Enviar", () => {
    const onSend = vi.fn();
    render(<ComposerView {...defaultProps} draft="hola" onSend={onSend} />);
    fireEvent.click(screen.getByLabelText("Enviar mensaje"));
    expect(onSend).toHaveBeenCalledOnce();
  });

  it("botón Enviar deshabilitado sin draft ni media", () => {
    render(<ComposerView {...defaultProps} draft="" pendingMedia={null} />);
    expect(screen.getByLabelText("Enviar mensaje")).toBeDisabled();
  });

  it("botón Enviar habilitado con draft", () => {
    render(<ComposerView {...defaultProps} draft="hola" />);
    expect(screen.getByLabelText("Enviar mensaje")).not.toBeDisabled();
  });

  it("muestra sugerencias de slash cuando slashSuggestions no está vacío", () => {
    const suggestions: Shortcut[] = [
      { uuid: "1", atajo: "/hola", texto: "Hola, ¿en qué te puedo ayudar?" },
    ];
    render(<ComposerView {...defaultProps} slashSuggestions={suggestions} />);
    expect(screen.getByText("/hola")).toBeInTheDocument();
    expect(screen.getByText("Hola, ¿en qué te puedo ayudar?")).toBeInTheDocument();
  });

  it("llama onApplyRespuesta al hacer mousedown en una sugerencia", () => {
    const onApplyRespuesta = vi.fn();
    const suggestions: Shortcut[] = [
      { uuid: "1", atajo: "/hola", texto: "Bienvenido" },
    ];
    render(
      <ComposerView {...defaultProps} slashSuggestions={suggestions} onApplyRespuesta={onApplyRespuesta} />,
    );
    fireEvent.mouseDown(screen.getByText("/hola").closest("button")!);
    expect(onApplyRespuesta).toHaveBeenCalledWith("Bienvenido");
  });

  it("aplica primera sugerencia al presionar Tab", () => {
    const onApplyRespuesta = vi.fn();
    const suggestions: Shortcut[] = [
      { uuid: "1", atajo: "/hola", texto: "Primera sugerencia" },
      { uuid: "2", atajo: "/gracias", texto: "Segunda sugerencia" },
    ];
    render(
      <ComposerView {...defaultProps} slashSuggestions={suggestions} onApplyRespuesta={onApplyRespuesta} />,
    );
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Mensaje" }), { key: "Tab" });
    expect(onApplyRespuesta).toHaveBeenCalledWith("Primera sugerencia");
  });

  it("muestra el panel de respuestas rápidas cuando showRespuestasPanel=true", () => {
    render(<ComposerView {...defaultProps} showRespuestasPanel={true} />);
    expect(screen.getByTestId("respuestas-panel")).toBeInTheDocument();
  });

  it("oculta el panel de respuestas cuando showRespuestasPanel=false", () => {
    render(<ComposerView {...defaultProps} showRespuestasPanel={false} />);
    expect(screen.queryByTestId("respuestas-panel")).not.toBeInTheDocument();
  });

  it("muestra el VoiceRecorder cuando showRecorder=true", () => {
    render(<ComposerView {...defaultProps} showRecorder={true} />);
    expect(screen.getByText("MockVoiceRecorder")).toBeInTheDocument();
  });

  it("llama onToggleRecorder al hacer click en Grabar audio", () => {
    const onToggleRecorder = vi.fn();
    render(<ComposerView {...defaultProps} onToggleRecorder={onToggleRecorder} />);
    fireEvent.click(screen.getByLabelText("Grabar audio"));
    expect(onToggleRecorder).toHaveBeenCalledOnce();
  });

  it("textarea deshabilitado cuando blocked=true", () => {
    render(<ComposerView {...defaultProps} blocked={true} />);
    expect(screen.getByRole("textbox", { name: "Mensaje" })).toBeDisabled();
  });
});
