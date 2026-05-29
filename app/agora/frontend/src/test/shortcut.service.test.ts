import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("@/utils/getAuthHeaders", () => ({
  getAuthHeaders: () => ({
    Authorization: "Bearer test-token",
    "Content-Type": "application/json",
  }),
}));

import {
  fetchShortcuts,
  fetchShortcut,
  createShortcut,
  updateShortcut,
  deleteShortcut,
} from "@/services/shortcut.service";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockClear();
});

// shortcut.service accede a .data directamente (no usa unwrapEnvelope)
const ok = (data: unknown) => ({
  ok: true,
  json: async () => ({ data }),
});

const notOk = () => ({ ok: false });

// ─── fetchShortcuts ───────────────────────────────────────────────────────────

describe("fetchShortcuts", () => {
  it("GET /shortcut y devuelve la lista de atajos", async () => {
    const shortcuts = [{ uuid: "abc", atajo: "/hola", texto: "Hola, ¿cómo te puedo ayudar?" }];
    mockFetch.mockResolvedValueOnce(ok(shortcuts));
    const result = await fetchShortcuts();
    expect(result).toEqual(shortcuts);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("/shortcut");
  });

  it("lanza error si la respuesta no es ok", async () => {
    mockFetch.mockResolvedValueOnce(notOk());
    await expect(fetchShortcuts()).rejects.toThrow("Error al obtener atajos");
  });
});

// ─── fetchShortcut ────────────────────────────────────────────────────────────

describe("fetchShortcut", () => {
  it("GET /shortcut/:uuid y devuelve el atajo", async () => {
    const shortcut = { uuid: "abc", atajo: "/hola", texto: "Hola!" };
    mockFetch.mockResolvedValueOnce(ok(shortcut));
    const result = await fetchShortcut("abc");
    expect(result.uuid).toBe("abc");
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("/shortcut/abc");
  });

  it("lanza error si el atajo no existe", async () => {
    mockFetch.mockResolvedValueOnce(notOk());
    await expect(fetchShortcut("no-existe")).rejects.toThrow("Atajo no encontrado");
  });
});

// ─── createShortcut ───────────────────────────────────────────────────────────

describe("createShortcut", () => {
  it("POST /shortcut con los datos del atajo y devuelve el creado", async () => {
    const dto = { atajo: "/bienvenida", texto: "Bienvenido, ¿en qué te ayudo?" };
    const created = { uuid: "xyz", ...dto };
    mockFetch.mockResolvedValueOnce(ok(created));
    const result = await createShortcut(dto);
    expect(result.uuid).toBe("xyz");
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/shortcut");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body as string)).toEqual(dto);
  });

  it("lanza error si la creación falla", async () => {
    mockFetch.mockResolvedValueOnce(notOk());
    await expect(
      createShortcut({ atajo: "/x", texto: "Y" }),
    ).rejects.toThrow("Error al crear atajo");
  });
});

// ─── updateShortcut ───────────────────────────────────────────────────────────

describe("updateShortcut", () => {
  it("PUT /shortcut/:uuid con los campos actualizados", async () => {
    const updated = { uuid: "abc", atajo: "/nuevo", texto: "Texto nuevo" };
    mockFetch.mockResolvedValueOnce(ok(updated));
    const result = await updateShortcut("abc", { texto: "Texto nuevo" });
    expect(result.texto).toBe("Texto nuevo");
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/shortcut/abc");
    expect(opts.method).toBe("PUT");
  });

  it("lanza error si la actualización falla", async () => {
    mockFetch.mockResolvedValueOnce(notOk());
    await expect(updateShortcut("abc", { texto: "X" })).rejects.toThrow(
      "Error al actualizar atajo",
    );
  });
});

// ─── deleteShortcut ───────────────────────────────────────────────────────────

describe("deleteShortcut", () => {
  it("DELETE /shortcut/:uuid y devuelve el mensaje de confirmación", async () => {
    mockFetch.mockResolvedValueOnce(ok({ message: "Eliminado" }));
    const result = await deleteShortcut("abc");
    expect(result.message).toBe("Eliminado");
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/shortcut/abc");
    expect(opts.method).toBe("DELETE");
  });

  it("lanza error si la eliminación falla", async () => {
    mockFetch.mockResolvedValueOnce(notOk());
    await expect(deleteShortcut("abc")).rejects.toThrow("Error al eliminar atajo");
  });
});
