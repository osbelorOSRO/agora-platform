import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("@/utils/getAuthHeaders", () => ({
  getAuthHeaders: () => ({
    Authorization: "Bearer test-token",
    "Content-Type": "application/json",
  }),
}));

import {
  listMetaInboxThreads,
  listMetaInboxMessages,
  sendMetaInboxText,
  updateMetaInboxContact,
  updateMetaInboxThreadControl,
  listMetaInboxContacts,
  createWhatsappContact,
  reopenMetaInboxThread,
} from "@/services/metaInbox.service";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockClear();
});

const ok = (data: unknown) => ({
  ok: true,
  json: async () => data,
});

const notOk = () => ({ ok: false });

// ─── listMetaInboxThreads ─────────────────────────────────────────────────────

describe("listMetaInboxThreads", () => {
  it("GET /meta-inbox/threads y devuelve array", async () => {
    const threads = [{ sessionId: "s-1", contactName: "Juan" }];
    mockFetch.mockResolvedValueOnce(ok(threads));
    const result = await listMetaInboxThreads();
    expect(result).toEqual(threads);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("/meta-inbox/threads");
  });

  it("incluye limit, offset e includeClosed en la query string", async () => {
    mockFetch.mockResolvedValueOnce(ok([]));
    await listMetaInboxThreads(50, 10, true);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("limit=50");
    expect(url).toContain("offset=10");
    expect(url).toContain("includeClosed=true");
  });

  it("usa defaults limit=100 offset=0 includeClosed=false", async () => {
    mockFetch.mockResolvedValueOnce(ok([]));
    await listMetaInboxThreads();
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("limit=100");
    expect(url).toContain("offset=0");
    expect(url).toContain("includeClosed=false");
  });

  it("lanza error si la respuesta no es ok", async () => {
    mockFetch.mockResolvedValueOnce(notOk());
    await expect(listMetaInboxThreads()).rejects.toThrow(
      "No se pudieron cargar las conversaciones",
    );
  });

  it("desenvuelve envelope { data, statusCode } del TransformInterceptor", async () => {
    const threads = [{ sessionId: "s-1" }];
    mockFetch.mockResolvedValueOnce(
      ok({ data: threads, statusCode: 200, message: "OK" }),
    );
    const result = await listMetaInboxThreads();
    expect(result).toEqual(threads);
  });
});

// ─── listMetaInboxMessages ────────────────────────────────────────────────────

describe("listMetaInboxMessages", () => {
  it("GET mensajes de un thread por sessionId", async () => {
    const messages = [{ id: "m-1", content: "Hola" }];
    mockFetch.mockResolvedValueOnce(ok(messages));
    const result = await listMetaInboxMessages("session-abc");
    expect(result).toEqual(messages);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("session-abc");
    expect(url).toContain("includeSystem=false");
  });

  it("lanza error si la respuesta no es ok", async () => {
    mockFetch.mockResolvedValueOnce(notOk());
    await expect(listMetaInboxMessages("session-abc")).rejects.toThrow(
      "No se pudieron cargar los mensajes",
    );
  });
});

// ─── sendMetaInboxText ────────────────────────────────────────────────────────

describe("sendMetaInboxText", () => {
  it("POST con el texto y devuelve la respuesta del servidor", async () => {
    const data = { id: "msg-1", content: "Hola" };
    mockFetch.mockResolvedValueOnce(ok(data));
    const result = await sendMetaInboxText("session-abc", "Hola");
    expect(result).toEqual(data);
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/session-abc/send-text");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body as string)).toEqual({ text: "Hola" });
  });

  it("lanza error si la respuesta no es ok", async () => {
    mockFetch.mockResolvedValueOnce(notOk());
    await expect(sendMetaInboxText("session-abc", "Hola")).rejects.toThrow(
      "No se pudo enviar el mensaje",
    );
  });
});

// ─── updateMetaInboxContact ───────────────────────────────────────────────────

describe("updateMetaInboxContact", () => {
  it("PATCH /meta-inbox/threads/:sessionId/contact", async () => {
    mockFetch.mockResolvedValueOnce(ok({ sessionId: "s-1" }));
    await updateMetaInboxContact("s-1", { displayName: "Juan Actualizado" });
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/s-1/contact");
    expect(opts.method).toBe("PATCH");
    expect(JSON.parse(opts.body as string)).toMatchObject({
      displayName: "Juan Actualizado",
    });
  });
});

// ─── updateMetaInboxThreadControl ────────────────────────────────────────────

describe("updateMetaInboxThreadControl", () => {
  it("PATCH /meta-inbox/threads/:sessionId/control", async () => {
    mockFetch.mockResolvedValueOnce(ok({ sessionId: "s-1" }));
    await updateMetaInboxThreadControl("s-1", { threadStatus: "closed" });
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/s-1/control");
    expect(opts.method).toBe("PATCH");
  });
});

// ─── listMetaInboxContacts ────────────────────────────────────────────────────

describe("listMetaInboxContacts", () => {
  it("GET /meta-inbox/contacts con params por defecto", async () => {
    const data = { items: [], total: 0, limit: 50, offset: 0, hasNext: false };
    mockFetch.mockResolvedValueOnce(ok(data));
    await listMetaInboxContacts();
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("/meta-inbox/contacts");
    expect(url).toContain("limit=50");
    expect(url).toContain("offset=0");
  });

  it("agrega search a la query si se provee y no está vacío", async () => {
    mockFetch.mockResolvedValueOnce(ok({ items: [], total: 0, limit: 50, offset: 0, hasNext: false }));
    await listMetaInboxContacts({ search: "Juan" });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("search=Juan");
  });

  it("agrega objectType si no es ALL", async () => {
    mockFetch.mockResolvedValueOnce(ok({ items: [], total: 0, limit: 50, offset: 0, hasNext: false }));
    await listMetaInboxContacts({ objectType: "WHATSAPP" });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("objectType=WHATSAPP");
  });

  it("no agrega objectType si es ALL", async () => {
    mockFetch.mockResolvedValueOnce(ok({ items: [], total: 0, limit: 50, offset: 0, hasNext: false }));
    await listMetaInboxContacts({ objectType: "ALL" });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).not.toContain("objectType");
  });
});

// ─── createWhatsappContact ────────────────────────────────────────────────────

describe("createWhatsappContact", () => {
  it("POST /meta-inbox/contacts/whatsapp y devuelve el contacto creado", async () => {
    const contact = {
      actorExternalId: "wa-123",
      objectType: "WHATSAPP",
      displayName: "Pedro García",
      firstName: null,
      lastName: null,
      phone: "+56912345678",
      rut: null,
      address: null,
      email: null,
      notes: null,
      city: null,
      region: null,
    };
    mockFetch.mockResolvedValueOnce(ok(contact));
    const result = await createWhatsappContact({ phone: "+56912345678", displayName: "Pedro García" });
    expect(result.phone).toBe("+56912345678");
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/contacts/whatsapp");
    expect(opts.method).toBe("POST");
  });

  it("lanza error si la creación falla", async () => {
    mockFetch.mockResolvedValueOnce(notOk());
    await expect(createWhatsappContact({ phone: "+56999999999" })).rejects.toThrow(
      "No se pudo crear el contacto WhatsApp",
    );
  });
});

// ─── reopenMetaInboxThread ────────────────────────────────────────────────────

describe("reopenMetaInboxThread", () => {
  it("POST /meta-inbox/threads/:sessionId/reopen y devuelve el thread", async () => {
    const thread = { sessionId: "s-1", status: "open" };
    mockFetch.mockResolvedValueOnce(ok(thread));
    const result = await reopenMetaInboxThread("s-1");
    expect(result.sessionId).toBe("s-1");
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/s-1/reopen");
    expect(opts.method).toBe("POST");
  });

  it("lanza error si la respuesta no es ok", async () => {
    mockFetch.mockResolvedValueOnce(notOk());
    await expect(reopenMetaInboxThread("s-1")).rejects.toThrow(
      "No se pudo abrir una nueva atencion",
    );
  });
});
