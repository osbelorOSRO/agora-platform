import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWelcomeDashboard } from "@/modules/welcome/hooks/useWelcomeDashboard";
import type { UserFeatures } from "@/utils/getTokenData";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetTokenData = vi.fn();
vi.mock("@/utils/getTokenData", () => ({
  getTokenData: () => mockGetTokenData(),
}));

vi.mock("@/modules/accesos/services/reportesService", () => ({
  obtenerActividadSemanalThreads: vi.fn().mockResolvedValue([]),
  listarReportes: vi.fn().mockResolvedValue([]),
  descargarReporteCsv: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/metaInbox.service", () => ({
  listMetaInboxContacts: vi.fn().mockResolvedValue({ total: 5, contacts: [] }),
  listMetaInboxThreads: vi.fn().mockResolvedValue([
    { sessionId: "s1", threadStatus: "OPEN" },
    { sessionId: "s2", threadStatus: "CLOSED" },
    { sessionId: "s3", threadStatus: "OPEN" },
  ]),
  updateMetaInboxContact: vi.fn().mockResolvedValue({}),
  sendMetaInboxMessage: vi.fn().mockResolvedValue({}),
  listMetaInboxMessages: vi.fn().mockResolvedValue([]),
  updateMetaInboxThreadControl: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/context/NotificacionContext", () => ({
  useNotificaciones: () => ({ unreadCount: 3 }),
}));

vi.mock("@/modules/welcome/utils", () => ({
  getWeeklyWindow: () => ({ desde: "2026-05-23", hasta: "2026-05-29" }),
  buildWeeklyBuckets: vi.fn().mockReturnValue([
    { label: "Lun", total: 2 },
    { label: "Mar", total: 4 },
  ]),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const allFeatures: UserFeatures = {
  conversations: true,
  reports: true,
  settings: true,
  botView: true,
  botControl: true,
  scheduleControl: true,
  salesManagement: true,
  socialPostings: true,
  superadmin: false,
};

const noFeatures: UserFeatures = {
  conversations: false,
  reports: false,
  settings: false,
  botView: false,
  botControl: false,
  scheduleControl: false,
  salesManagement: false,
  socialPostings: false,
  superadmin: false,
};

describe("useWelcomeDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("enabledModulesCount", () => {
    it("es 0 cuando no hay features", () => {
      mockGetTokenData.mockReturnValue({ features: noFeatures });
      const { result } = renderHook(() => useWelcomeDashboard());
      expect(result.current.enabledModulesCount).toBe(0);
    });

    it("cuenta correctamente con todas las features habilitadas", () => {
      mockGetTokenData.mockReturnValue({ features: allFeatures });
      const { result } = renderHook(() => useWelcomeDashboard());
      // conversations, reports, settings, botView, botControl, scheduleControl = 6
      expect(result.current.enabledModulesCount).toBe(6);
    });

    it("cuenta solo las features activas", () => {
      mockGetTokenData.mockReturnValue({
        features: { ...noFeatures, conversations: true, reports: true },
      });
      const { result } = renderHook(() => useWelcomeDashboard());
      expect(result.current.enabledModulesCount).toBe(2);
    });
  });

  describe("botStatus", () => {
    it("es 'Control total' con botControl", () => {
      mockGetTokenData.mockReturnValue({ features: { ...noFeatures, botControl: true } });
      const { result } = renderHook(() => useWelcomeDashboard());
      expect(result.current.botStatus).toBe("Control total");
    });

    it("es 'Solo lectura' con botView pero sin botControl", () => {
      mockGetTokenData.mockReturnValue({ features: { ...noFeatures, botView: true } });
      const { result } = renderHook(() => useWelcomeDashboard());
      expect(result.current.botStatus).toBe("Solo lectura");
    });

    it("es 'Sin acceso' sin ningún permiso de bot", () => {
      mockGetTokenData.mockReturnValue({ features: noFeatures });
      const { result } = renderHook(() => useWelcomeDashboard());
      expect(result.current.botStatus).toBe("Sin acceso");
    });
  });

  describe("scheduleControl", () => {
    it("es false cuando no hay feature", () => {
      mockGetTokenData.mockReturnValue({ features: noFeatures });
      const { result } = renderHook(() => useWelcomeDashboard());
      expect(result.current.scheduleControl).toBe(false);
    });

    it("es true cuando scheduleControl está habilitado", () => {
      mockGetTokenData.mockReturnValue({ features: { ...noFeatures, scheduleControl: true } });
      const { result } = renderHook(() => useWelcomeDashboard());
      expect(result.current.scheduleControl).toBe(true);
    });
  });

  describe("moduleCards", () => {
    it("retorna 5 tarjetas siempre", () => {
      mockGetTokenData.mockReturnValue({ features: allFeatures });
      const { result } = renderHook(() => useWelcomeDashboard());
      expect(result.current.moduleCards).toHaveLength(5);
    });

    it("Contacts deshabilitado sin conversations", () => {
      mockGetTokenData.mockReturnValue({ features: noFeatures });
      const { result } = renderHook(() => useWelcomeDashboard());
      const contacts = result.current.moduleCards.find((c) => c.title === "Contacts");
      expect(contacts?.enabled).toBe(false);
    });

    it("Contacts habilitado con conversations", () => {
      mockGetTokenData.mockReturnValue({ features: { ...noFeatures, conversations: true } });
      const { result } = renderHook(() => useWelcomeDashboard());
      const contacts = result.current.moduleCards.find((c) => c.title === "Contacts");
      expect(contacts?.enabled).toBe(true);
    });

    it("WA Backend deshabilitado sin botView", () => {
      mockGetTokenData.mockReturnValue({ features: noFeatures });
      const { result } = renderHook(() => useWelcomeDashboard());
      const wa = result.current.moduleCards.find((c) => c.title === "WA Backend");
      expect(wa?.enabled).toBe(false);
    });

    it("Notificaciones siempre habilitado", () => {
      mockGetTokenData.mockReturnValue({ features: noFeatures });
      const { result } = renderHook(() => useWelcomeDashboard());
      const notif = result.current.moduleCards.find((c) => c.title === "Notificaciones");
      expect(notif?.enabled).toBe(true);
    });
  });

  describe("permisosRows", () => {
    it("no incluye fila de superadmin si no es superadmin", () => {
      mockGetTokenData.mockReturnValue({ features: { ...allFeatures, superadmin: false } });
      const { result } = renderHook(() => useWelcomeDashboard());
      const superRow = result.current.permisosRows.find(([label]) =>
        label.includes("Stages"),
      );
      expect(superRow).toBeUndefined();
    });

    it("incluye fila de superadmin si es superadmin", () => {
      mockGetTokenData.mockReturnValue({ features: { ...allFeatures, superadmin: true } });
      const { result } = renderHook(() => useWelcomeDashboard());
      const superRow = result.current.permisosRows.find(([label]) =>
        label.includes("Stages"),
      );
      expect(superRow).toBeDefined();
      expect(superRow?.[1]).toBe(true);
    });

    it("tiene 6 filas base (sin superadmin)", () => {
      mockGetTokenData.mockReturnValue({ features: { ...allFeatures, superadmin: false } });
      const { result } = renderHook(() => useWelcomeDashboard());
      expect(result.current.permisosRows).toHaveLength(6);
    });

    it("tiene 7 filas cuando es superadmin", () => {
      mockGetTokenData.mockReturnValue({ features: { ...allFeatures, superadmin: true } });
      const { result } = renderHook(() => useWelcomeDashboard());
      expect(result.current.permisosRows).toHaveLength(7);
    });
  });

  describe("weeklyData y chart", () => {
    it("retorna weeklyData del buildWeeklyBuckets mock", async () => {
      mockGetTokenData.mockReturnValue({ features: noFeatures });
      const { result } = renderHook(() => useWelcomeDashboard());
      await act(async () => {});
      expect(result.current.weeklyData).toEqual([
        { label: "Lun", total: 2 },
        { label: "Mar", total: 4 },
      ]);
    });

    it("maxWeeklyTotal es el máximo del weeklyData", async () => {
      mockGetTokenData.mockReturnValue({ features: noFeatures });
      const { result } = renderHook(() => useWelcomeDashboard());
      await act(async () => {});
      expect(result.current.maxWeeklyTotal).toBe(4);
    });
  });

  it("maneja tokenData null sin lanzar error", () => {
    mockGetTokenData.mockReturnValue(null);
    expect(() => renderHook(() => useWelcomeDashboard())).not.toThrow();
  });
});
