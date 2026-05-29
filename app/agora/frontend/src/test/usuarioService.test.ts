import { vi, describe, it, expect, beforeEach } from "vitest";
import apiClient from "@/lib/apiClient";

vi.mock("@/lib/apiClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
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
  obtenerUsuarios,
  actualizarUsuario,
  adminResetPassword,
  adminReset2FA,
  desbloquearUsuario,
  regenerarInvitacion,
  cancelarPreregistro,
} from "@/modules/accesos/services/usuarioService";

const mock = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

beforeEach(() => vi.clearAllMocks());

describe("obtenerUsuarios", () => {
  it("GET /api/auth/usuarios y devuelve la lista", async () => {
    const usuarios = [
      { id: 1, username: "juan", nombre: "Juan", apellido: "Pérez" },
      { id: 2, username: "ana", nombre: "Ana", apellido: "López" },
    ];
    mock.get.mockResolvedValueOnce({ data: usuarios });
    const result = await obtenerUsuarios();
    expect(result).toHaveLength(2);
    expect(result[0].username).toBe("juan");
    const url = mock.get.mock.calls[0][0] as string;
    expect(url).toContain("/api/auth/usuarios");
  });
});

describe("actualizarUsuario", () => {
  it("PATCH /api/auth/usuarios/:id con los campos enviados", async () => {
    mock.patch.mockResolvedValueOnce({ data: { id: 3, nombre: "Carlos" } });
    const result = await actualizarUsuario(3, { nombre: "Carlos" });
    expect(result.nombre).toBe("Carlos");
    const url = mock.patch.mock.calls[0][0] as string;
    expect(url).toContain("/api/auth/usuarios/3");
  });
});

describe("adminResetPassword", () => {
  it("POST /api/auth/usuarios/:id/reset-password y devuelve resetToken", async () => {
    const data = { resetToken: "tok-abc", expiresAt: "2024-06-16T00:00:00Z" };
    mock.post.mockResolvedValueOnce({ data });
    const result = await adminResetPassword(7);
    expect(result.resetToken).toBe("tok-abc");
    const url = mock.post.mock.calls[0][0] as string;
    expect(url).toContain("/usuarios/7/reset-password");
  });
});

describe("adminReset2FA", () => {
  it("POST /api/auth/usuarios/:id/reset-2fa y devuelve bypassToken", async () => {
    const data = { bypassToken: "bypass-xyz", expiresAt: "2024-06-16T00:00:00Z" };
    mock.post.mockResolvedValueOnce({ data });
    const result = await adminReset2FA(8);
    expect(result.bypassToken).toBe("bypass-xyz");
    const url = mock.post.mock.calls[0][0] as string;
    expect(url).toContain("/usuarios/8/reset-2fa");
  });
});

describe("desbloquearUsuario", () => {
  it("POST /api/auth/usuarios/:id/desbloquear sin body", async () => {
    mock.post.mockResolvedValueOnce({ data: undefined });
    await desbloquearUsuario(4);
    const url = mock.post.mock.calls[0][0] as string;
    expect(url).toContain("/usuarios/4/desbloquear");
  });
});

describe("regenerarInvitacion", () => {
  it("POST /api/auth/usuarios/:id/regenerar-invitacion y devuelve invitationToken", async () => {
    const data = { invitationToken: "inv-123", expiresAt: "2024-06-16T00:00:00Z" };
    mock.post.mockResolvedValueOnce({ data });
    const result = await regenerarInvitacion(9);
    expect(result.invitationToken).toBe("inv-123");
    const url = mock.post.mock.calls[0][0] as string;
    expect(url).toContain("/usuarios/9/regenerar-invitacion");
  });
});

describe("cancelarPreregistro", () => {
  it("DELETE /api/auth/usuarios/:id/preregistro", async () => {
    mock.delete.mockResolvedValueOnce({ data: undefined });
    await cancelarPreregistro(10);
    const url = mock.delete.mock.calls[0][0] as string;
    expect(url).toContain("/usuarios/10/preregistro");
  });
});
