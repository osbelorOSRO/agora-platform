import { describe, it, expect } from "vitest";
import { isChunkLoadError } from "@/components/ChunkErrorPage";

describe("isChunkLoadError", () => {
  it("detecta ChunkLoadError por nombre", () => {
    const err = Object.assign(new Error("chunk"), { name: "ChunkLoadError" });
    expect(isChunkLoadError(err)).toBe(true);
  });

  it("detecta mensaje de Vite dynamically imported module", () => {
    const err = new Error("Failed to fetch dynamically imported module: /assets/MetaInboxPage-abc.js");
    expect(isChunkLoadError(err)).toBe(true);
  });

  it("detecta mensaje de webpack chunk failed", () => {
    const err = new Error("Loading chunk 42 failed");
    expect(isChunkLoadError(err)).toBe(true);
  });

  it("detecta error loading dynamically imported module", () => {
    const err = new Error("Error loading dynamically imported module");
    expect(isChunkLoadError(err)).toBe(true);
  });

  it("no detecta errores genéricos", () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isChunkLoadError(new Error("Network Error"))).toBe(false);
    expect(isChunkLoadError(new Error(""))).toBe(false);
  });

  it("es insensible a mayúsculas en el mensaje", () => {
    const err = new Error("FAILED TO FETCH DYNAMICALLY IMPORTED MODULE");
    expect(isChunkLoadError(err)).toBe(true);
  });
});
