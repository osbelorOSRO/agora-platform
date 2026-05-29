import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useComposer } from "@/modules/metaInbox/hooks/useComposer";

// fetchShortcuts produce una red que no queremos en tests
vi.mock("@/services/shortcut.service", () => ({
  fetchShortcuts: vi.fn().mockResolvedValue([
    { uuid: "1", atajo: "/hola", texto: "Hola, ¿en qué te puedo ayudar?" },
    { uuid: "2", atajo: "/gracias", texto: "Gracias por contactarnos." },
  ]),
}));

describe("useComposer", () => {
  it("draft empieza vacío", () => {
    const { result } = renderHook(() => useComposer());
    expect(result.current.draft).toBe("");
  });

  it("handleDraftChange actualiza el draft", () => {
    const { result } = renderHook(() => useComposer());
    act(() => result.current.handleDraftChange("hola mundo"));
    expect(result.current.draft).toBe("hola mundo");
  });

  it("clearDraft vacía el draft y las sugerencias", () => {
    const { result } = renderHook(() => useComposer());
    act(() => result.current.handleDraftChange("texto"));
    act(() => result.current.clearDraft());
    expect(result.current.draft).toBe("");
    expect(result.current.slashSuggestions).toHaveLength(0);
  });

  it("genera slashSuggestions al escribir /", async () => {
    const { result } = renderHook(() => useComposer());
    // Esperar que fetchShortcuts resuelva
    await act(async () => {});
    act(() => result.current.handleDraftChange("/hola"));
    expect(result.current.slashSuggestions.length).toBeGreaterThan(0);
    expect(result.current.slashSuggestions[0].atajo).toBe("/hola");
  });

  it("limpia sugerencias cuando el draft no empieza con /", async () => {
    const { result } = renderHook(() => useComposer());
    await act(async () => {});
    act(() => result.current.handleDraftChange("/hola"));
    act(() => result.current.handleDraftChange("texto normal"));
    expect(result.current.slashSuggestions).toHaveLength(0);
  });

  it("applyRespuesta rellena el draft con el texto del atajo", async () => {
    const { result } = renderHook(() => useComposer());
    await act(async () => {});
    act(() => result.current.applyRespuesta("Gracias por contactarnos."));
    expect(result.current.draft).toBe("Gracias por contactarnos.");
    expect(result.current.slashSuggestions).toHaveLength(0);
  });

  it("pendingMedia empieza en null", () => {
    const { result } = renderHook(() => useComposer());
    expect(result.current.pendingMedia).toBeNull();
  });

  it("setPendingMedia actualiza el archivo pendiente", () => {
    const { result } = renderHook(() => useComposer());
    const file = new File([""], "imagen.jpg", { type: "image/jpeg" });
    act(() => result.current.setPendingMedia(file));
    expect(result.current.pendingMedia?.name).toBe("imagen.jpg");
  });

  it("showRecorder y showRespuestasPanel comienzan en false", () => {
    const { result } = renderHook(() => useComposer());
    expect(result.current.showRecorder).toBe(false);
    expect(result.current.showRespuestasPanel).toBe(false);
  });
});
