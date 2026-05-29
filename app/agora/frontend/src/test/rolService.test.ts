import { vi, describe, it, expect, beforeEach } from "vitest";
import apiClient from "@/lib/apiClient";

vi.mock("@/lib/apiClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  unwrapEnvelope: (json: unknown) => json,
}));

vi.mock("@/utils/getAuthHeaders", () => ({
  getAuthHeaders: () => ({
    Authorization: "Bearer test-token",
    "Content-Type": "application/json",
  }),
}));

import {
  obtenerRoles,
  obtenerRolPorId,
  crearRol,
  actualizarRol,
} from "@/modules/accesos/services/rolService";

const mock = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
};

beforeEach(() => vi.clearAllMocks());

describe("obtenerRoles", () => {
  it("GET /api/roles y devuelve la lista de roles", async () => {
    const roles = [
      { id: 1, nombre: "admin", permisos: [] },
      { id: 2, nombre: "agente", permisos: [] },
    ];
    mock.get.mockResolvedValueOnce({ data: roles });
    const result = await obtenerRoles();
    expect(result).toHaveLength(2);
    expect(result[0].nombre).toBe("admin");
    const url = mock.get.mock.calls[0][0] as string;
    expect(url).toContain("/api/roles");
  });

  it("devuelve array vacío si no hay roles", async () => {
    mock.get.mockResolvedValueOnce({ data: [] });
    const result = await obtenerRoles();
    expect(result).toEqual([]);
  });
});

describe("obtenerRolPorId", () => {
  it("GET /api/roles/:id y devuelve el rol", async () => {
    const rol = { id: 2, nombre: "agente", permisos: [{ id: 1, nombre: "vista_bot" }] };
    mock.get.mockResolvedValueOnce({ data: rol });
    const result = await obtenerRolPorId(2);
    expect(result.nombre).toBe("agente");
    const url = mock.get.mock.calls[0][0] as string;
    expect(url).toContain("/api/roles/2");
  });
});

describe("crearRol", () => {
  it("POST /api/roles con nombre y lista de permisos", async () => {
    const payload = { nombre: "supervisor", permisos: [1, 3] };
    mock.post.mockResolvedValueOnce({ data: { id: 5, ...payload } });
    const result = await crearRol(payload);
    expect(result.id).toBe(5);
    expect(result.nombre).toBe("supervisor");
    expect(mock.post).toHaveBeenCalledWith(
      expect.stringContaining("/api/roles"),
      payload,
      expect.any(Object),
    );
  });
});

describe("actualizarRol", () => {
  it("PUT /api/roles/:id con los datos actualizados", async () => {
    const payload = { nombre: "supervisor-senior", permisos: [1, 2, 3] };
    mock.put.mockResolvedValueOnce({ data: { id: 5, ...payload } });
    const result = await actualizarRol(5, payload);
    expect(result.nombre).toBe("supervisor-senior");
    const url = mock.put.mock.calls[0][0] as string;
    expect(url).toContain("/api/roles/5");
    expect(mock.put).toHaveBeenCalledWith(
      expect.stringContaining("/api/roles/5"),
      payload,
      expect.any(Object),
    );
  });
});
