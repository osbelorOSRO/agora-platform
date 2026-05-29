import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { useMetaInbox } from "@/modules/metaInbox/hooks/useMetaInbox";
import type { MetaInboxThread } from "@/types/metaInbox";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockConnectSocket = vi.fn();
const mockOnThreadUpsert = vi.fn();
const mockOffThreadUpsert = vi.fn();
const mockOnMessageNew = vi.fn();
const mockOffMessageNew = vi.fn();

vi.mock("@/services/socket", () => ({
  connectSocket: () => mockConnectSocket(),
  onMetaInboxThreadUpsert: (cb: unknown) => mockOnThreadUpsert(cb),
  offMetaInboxThreadUpsert: () => mockOffThreadUpsert(),
  onMetaInboxMessageNew: (cb: unknown) => mockOnMessageNew(cb),
  offMetaInboxMessageNew: () => mockOffMessageNew(),
}));

const mockListThreads = vi.fn().mockResolvedValue([]);
const mockListMessages = vi.fn().mockResolvedValue([]);

vi.mock("@/services/metaInbox.service", () => ({
  listMetaInboxThreads: (...args: unknown[]) => mockListThreads(...args),
  listMetaInboxMessages: (...args: unknown[]) => mockListMessages(...args),
  sendMetaInboxText: vi.fn().mockResolvedValue({}),
  sendMetaInboxMedia: vi.fn().mockResolvedValue({}),
  updateMetaInboxThreadControl: vi.fn().mockResolvedValue({}),
  reopenMetaInboxThread: vi.fn().mockResolvedValue({}),
  updateWhatsappBlockStatus: vi.fn().mockResolvedValue({}),
  updateMetaInboxContact: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/utils/mediaUrl", () => ({
  normalizeMediaUrl: (url: string) => url,
}));

// ── Wrapper ───────────────────────────────────────────────────────────────────

function createWrapper(initialEntries = ["/"]) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: 0 }, mutations: { retry: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(
      QueryClientProvider, { client: qc },
      createElement(MemoryRouter, { initialEntries }, children),
    );
}

const makeThread = (overrides: Partial<MetaInboxThread> = {}): MetaInboxThread => ({
  sessionId: "sess-1",
  actorExternalId: "actor-1",
  objectType: "WHATSAPP",
  sourceChannel: "WHATSAPP",
  threadStatus: "OPEN",
  attentionMode: "BOT",
  threadStage: "LEAD",
  displayName: "Ana García",
  firstName: "Ana", lastName: "García",
  phone: "+56912345678",
  rut: null, address: null, email: null, notes: null,
  city: null, region: null,
  lastMessageText: "Hola",
  lastDirection: "INBOUND",
  lastMessageAt: "2026-05-29T12:00:00Z",
  ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useMetaInbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListThreads.mockResolvedValue([]);
    mockListMessages.mockResolvedValue([]);
  });

  describe("estado inicial", () => {
    it("statusView comienza en OPEN", () => {
      const { result } = renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      expect(result.current.statusView).toBe("OPEN");
    });

    it("searchQuery comienza vacío", () => {
      const { result } = renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      expect(result.current.searchQuery).toBe("");
    });

    it("selectedThread es null al inicio", () => {
      const { result } = renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      expect(result.current.selectedThread).toBeNull();
    });

    it("error es null al inicio", () => {
      const { result } = renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      expect(result.current.error).toBeNull();
    });

    it("filteredThreads comienza vacío", () => {
      const { result } = renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      expect(result.current.filteredThreads).toHaveLength(0);
    });

    it("providerFilter y attentionFilter comienzan en ALL", () => {
      const { result } = renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      expect(result.current.providerFilter).toBe("ALL");
      expect(result.current.attentionFilter).toBe("ALL");
    });
  });

  describe("socket", () => {
    it("llama connectSocket al montar", () => {
      renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      expect(mockConnectSocket).toHaveBeenCalledOnce();
    });

    it("registra los listeners de socket al montar", () => {
      renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      expect(mockOnThreadUpsert).toHaveBeenCalled();
      expect(mockOnMessageNew).toHaveBeenCalled();
    });

    it("desregistra los listeners al desmontar", () => {
      const { unmount } = renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      unmount();
      expect(mockOffThreadUpsert).toHaveBeenCalled();
      expect(mockOffMessageNew).toHaveBeenCalled();
    });
  });

  describe("filtros de estado", () => {
    it("setStatusView cambia el filtro de estado", () => {
      const { result } = renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      act(() => result.current.setStatusView("CLOSED"));
      expect(result.current.statusView).toBe("CLOSED");
    });

    it("setSearchQuery actualiza la búsqueda", () => {
      const { result } = renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      act(() => result.current.setSearchQuery("ana"));
      expect(result.current.searchQuery).toBe("ana");
    });

    it("setProviderFilter actualiza el filtro de canal", () => {
      const { result } = renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      act(() => result.current.setProviderFilter("WHATSAPP"));
      expect(result.current.providerFilter).toBe("WHATSAPP");
    });

    it("setAttentionFilter actualiza el filtro de atención", () => {
      const { result } = renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      act(() => result.current.setAttentionFilter("HUMAN"));
      expect(result.current.attentionFilter).toBe("HUMAN");
    });
  });

  describe("selectThread y closeChat", () => {
    it("selectThread establece selectedSessionId", () => {
      const { result } = renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      act(() => result.current.selectThread("sess-42"));
      expect(result.current.selectedSessionId).toBe("sess-42");
    });

    it("selectThread con showDetail=true establece detailSessionId", () => {
      const { result } = renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      act(() => result.current.selectThread("sess-42", true));
      expect(result.current.detailSessionId).toBe("sess-42");
    });

    it("closeChat limpia selectedSessionId", () => {
      const { result } = renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      act(() => result.current.selectThread("sess-1"));
      act(() => result.current.closeChat());
      expect(result.current.selectedSessionId).toBeNull();
    });

    it("closeChat limpia detailSessionId", () => {
      const { result } = renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      act(() => result.current.selectThread("sess-1", true));
      act(() => result.current.closeChat());
      expect(result.current.detailSessionId).toBeNull();
    });
  });

  describe("filteredThreads con datos", () => {
    it("filtra por statusView OPEN", async () => {
      mockListThreads.mockResolvedValue([
        makeThread({ sessionId: "open-1", threadStatus: "OPEN" }),
        makeThread({ sessionId: "closed-1", threadStatus: "CLOSED" }),
      ]);
      const { result } = renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      await act(async () => {});
      act(() => result.current.setStatusView("OPEN"));
      expect(result.current.filteredThreads.every((t) => t.threadStatus === "OPEN")).toBe(true);
    });

    it("filtra por searchQuery sobre displayName", async () => {
      mockListThreads.mockResolvedValue([
        makeThread({ sessionId: "s1", displayName: "Ana García" }),
        makeThread({ sessionId: "s2", displayName: "Pedro López" }),
      ]);
      const { result } = renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      await act(async () => {});
      act(() => result.current.setSearchQuery("ana"));
      expect(result.current.filteredThreads).toHaveLength(1);
      expect(result.current.filteredThreads[0].displayName).toBe("Ana García");
    });

    it("filtra por providerFilter WHATSAPP", async () => {
      mockListThreads.mockResolvedValue([
        makeThread({ sessionId: "wa-1", objectType: "WHATSAPP" }),
        makeThread({ sessionId: "fb-1", objectType: "FACEBOOK" }),
      ]);
      const { result } = renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      await act(async () => {});
      act(() => result.current.setProviderFilter("WHATSAPP"));
      expect(result.current.filteredThreads.every((t) => t.objectType === "WHATSAPP")).toBe(true);
    });

    it("selectedThread se actualiza cuando hay threads y sessionId seleccionado", async () => {
      const thread = makeThread({ sessionId: "sess-1" });
      mockListThreads.mockResolvedValue([thread]);
      const { result } = renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      await act(async () => {});
      act(() => result.current.selectThread("sess-1"));
      expect(result.current.selectedThread?.sessionId).toBe("sess-1");
    });
  });

  describe("openMenuForSessionId", () => {
    it("setOpenMenuForSessionId controla el menú abierto", () => {
      const { result } = renderHook(() => useMetaInbox(), { wrapper: createWrapper() });
      act(() => result.current.setOpenMenuForSessionId("sess-1"));
      expect(result.current.openMenuForSessionId).toBe("sess-1");
      act(() => result.current.setOpenMenuForSessionId(null));
      expect(result.current.openMenuForSessionId).toBeNull();
    });
  });
});
