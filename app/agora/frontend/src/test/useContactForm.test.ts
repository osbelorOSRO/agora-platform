import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useContactForm } from "@/modules/metaInbox/hooks/useContactForm";
import type { MetaInboxThread } from "@/types/metaInbox";
import type { InboxRealtimePayload } from "@/modules/metaInbox/types";

const mockUpdateContact = vi.fn().mockResolvedValue({});
vi.mock("@/services/metaInbox.service", () => ({
  updateMetaInboxContact: (...args: unknown[]) => mockUpdateContact(...args),
  listMetaInboxThreads: vi.fn().mockResolvedValue([]),
  listMetaInboxContacts: vi.fn().mockResolvedValue({ total: 0, contacts: [] }),
  sendMetaInboxMessage: vi.fn().mockResolvedValue({}),
  listMetaInboxMessages: vi.fn().mockResolvedValue([]),
  updateMetaInboxThreadControl: vi.fn().mockResolvedValue({}),
}));

const makeThread = (overrides: Partial<MetaInboxThread> = {}): MetaInboxThread => ({
  sessionId: "sess-1",
  actorExternalId: "actor-1",
  objectType: "THREAD",
  sourceChannel: "WHATSAPP",
  threadStatus: "OPEN",
  attentionMode: "BOT",
  threadStage: "LEAD",
  displayName: "Juan Pérez",
  firstName: "Juan",
  lastName: "Pérez",
  phone: "+56912345678",
  rut: "12345678-9",
  address: "Calle 1",
  email: "juan@test.com",
  notes: "Nota de prueba",
  city: "Santiago",
  region: "RM",
  lastMessageText: "Hola",
  lastDirection: "INBOUND",
  lastMessageAt: "2026-05-01T10:00:00Z",
  ...overrides,
});

describe("useContactForm", () => {
  let mergeThread: Mock<(payload: InboxRealtimePayload) => void>;

  beforeEach(() => {
    mergeThread = vi.fn() as Mock<(payload: InboxRealtimePayload) => void>;
    mockUpdateContact.mockClear();
    mockUpdateContact.mockResolvedValue({});
  });

  it("form comienza vacío cuando no hay selectedThread", () => {
    const { result } = renderHook(() => useContactForm(null, mergeThread));
    expect(result.current.contactForm.displayName).toBe("");
    expect(result.current.contactForm.phone).toBe("");
    expect(result.current.savingContact).toBe(false);
    expect(result.current.contactError).toBeNull();
  });

  it("puebla el form cuando selectedThread cambia", () => {
    const thread = makeThread();
    const { result } = renderHook(() => useContactForm(thread, mergeThread));
    expect(result.current.contactForm.displayName).toBe("Juan Pérez");
    expect(result.current.contactForm.firstName).toBe("Juan");
    expect(result.current.contactForm.phone).toBe("+56912345678");
    expect(result.current.contactForm.email).toBe("juan@test.com");
  });

  it("actualiza form al cambiar selectedThread de un thread a otro", () => {
    const thread1 = makeThread({ displayName: "Ana", sessionId: "sess-1" });
    const thread2 = makeThread({ displayName: "Pedro", sessionId: "sess-2" });
    const { result, rerender } = renderHook(
      ({ t }: { t: MetaInboxThread | null }) => useContactForm(t, mergeThread),
      { initialProps: { t: thread1 } },
    );
    expect(result.current.contactForm.displayName).toBe("Ana");
    rerender({ t: thread2 });
    expect(result.current.contactForm.displayName).toBe("Pedro");
  });

  it("setContactForm actualiza campos individuales", () => {
    const thread = makeThread();
    const { result } = renderHook(() => useContactForm(thread, mergeThread));
    act(() => {
      result.current.setContactForm((prev) => ({ ...prev, city: "Valparaíso" }));
    });
    expect(result.current.contactForm.city).toBe("Valparaíso");
  });

  it("handleSaveContact no hace nada si no hay sessionId", async () => {
    const thread = makeThread({ sessionId: "" });
    const { result } = renderHook(() => useContactForm(thread, mergeThread));
    await act(async () => {
      await result.current.handleSaveContact();
    });
    expect(mockUpdateContact).not.toHaveBeenCalled();
    expect(mergeThread).not.toHaveBeenCalled();
  });

  it("handleSaveContact llama updateMetaInboxContact y mergeThread en éxito", async () => {
    const thread = makeThread();
    const { result } = renderHook(() => useContactForm(thread, mergeThread));
    await act(async () => {
      await result.current.handleSaveContact();
    });
    expect(mockUpdateContact).toHaveBeenCalledWith("sess-1", expect.objectContaining({
      displayName: "Juan Pérez",
      phone: "+56912345678",
    }));
    expect(mergeThread).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "sess-1" }),
    );
    expect(result.current.savingContact).toBe(false);
    expect(result.current.contactError).toBeNull();
  });

  it("handleSaveContact aplica trim a los campos", async () => {
    const thread = makeThread({ displayName: "  Juan  ", phone: "  +569  " });
    const { result } = renderHook(() => useContactForm(thread, mergeThread));
    await act(async () => {
      await result.current.handleSaveContact();
    });
    const payload = mockUpdateContact.mock.calls[0][1] as InboxRealtimePayload;
    expect((payload as any).displayName).toBe("Juan");
    expect((payload as any).phone).toBe("+569");
  });

  it("handleSaveContact establece contactError si el servicio falla", async () => {
    mockUpdateContact.mockRejectedValueOnce(new Error("Error de red"));
    const thread = makeThread();
    const { result } = renderHook(() => useContactForm(thread, mergeThread));
    await act(async () => {
      await result.current.handleSaveContact();
    });
    expect(result.current.contactError).toBe("Error de red");
    expect(result.current.savingContact).toBe(false);
  });
});
