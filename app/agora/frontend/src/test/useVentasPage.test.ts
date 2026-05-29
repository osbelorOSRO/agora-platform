import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useVentasPage } from "@/modules/ventas/hooks/useVentasPage";

vi.mock("@/modules/accesos/services/salesRecordService", () => ({
  obtenerVentas: vi.fn().mockResolvedValue([]),
  crearVenta: vi.fn().mockResolvedValue({}),
  actualizarVenta: vi.fn().mockResolvedValue({}),
  eliminarVenta: vi.fn().mockResolvedValue({}),
  obtenerPuntosMes: vi.fn().mockResolvedValue(null),
  obtenerCatalogo: vi.fn().mockResolvedValue([]),
  crearOferta: vi.fn().mockResolvedValue({}),
  actualizarOferta: vi.fn().mockResolvedValue({}),
  eliminarOferta: vi.fn().mockResolvedValue({}),
  obtenerMatrizPrecios: vi.fn().mockResolvedValue([]),
  crearPrecioNivel: vi.fn().mockResolvedValue({}),
  actualizarPrecioNivel: vi.fn().mockResolvedValue({}),
  eliminarPrecioNivel: vi.fn().mockResolvedValue({}),
  importarVentasCSV: vi.fn().mockResolvedValue({ success: 0, errors: [] }),
}));

function makeVenta(overrides: Partial<import("@/modules/accesos/types/salesRecord").SaleRecord> = {}) {
  return {
    id: 42, run: "12345678-9", full_name: "Ana López", phone: "+569", address: "Calle 1",
    city: "Santiago", province: "RM", country: "CL", contract_number: "C-001",
    fecha: "2026-05-01", modality: "POST_A_POST" as const, offers_code: "OFR1",
    offer_id: 1, level_price: 100, points: "10", offers_price: 100,
    ...overrides,
  };
}

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: 0, staleTime: 0 },
      mutations: { retry: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

describe("useVentasPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tab inicial es 'ventas'", () => {
    const { result } = renderHook(() => useVentasPage(), { wrapper: createWrapper() });
    expect(result.current.tab).toBe("ventas");
  });

  it("viewYear y viewMonth corresponden al mes actual", () => {
    const now = new Date();
    const { result } = renderHook(() => useVentasPage(), { wrapper: createWrapper() });
    expect(result.current.viewYear).toBe(now.getFullYear());
    expect(result.current.viewMonth).toBe(now.getMonth() + 1);
  });

  it("listas comienzan vacías", () => {
    const { result } = renderHook(() => useVentasPage(), { wrapper: createWrapper() });
    expect(result.current.ventas).toEqual([]);
    expect(result.current.catalogo).toEqual([]);
    expect(result.current.precios).toEqual([]);
  });

  it("modal de venta comienza cerrado", () => {
    const { result } = renderHook(() => useVentasPage(), { wrapper: createWrapper() });
    expect(result.current.modalVenta).toBe(false);
  });

  it("setTab cambia la pestaña activa", () => {
    const { result } = renderHook(() => useVentasPage(), { wrapper: createWrapper() });
    act(() => result.current.setTab("catalogo"));
    expect(result.current.tab).toBe("catalogo");
  });

  it("setModalVenta abre y cierra el modal", () => {
    const { result } = renderHook(() => useVentasPage(), { wrapper: createWrapper() });
    act(() => result.current.setModalVenta(true));
    expect(result.current.modalVenta).toBe(true);
    act(() => result.current.setModalVenta(false));
    expect(result.current.modalVenta).toBe(false);
  });

  it("goNext avanza al mes siguiente", () => {
    const { result } = renderHook(() => useVentasPage(), { wrapper: createWrapper() });
    const mesInicial = result.current.viewMonth;
    const anioInicial = result.current.viewYear;
    act(() => result.current.goNext());
    if (mesInicial === 12) {
      expect(result.current.viewMonth).toBe(1);
      expect(result.current.viewYear).toBe(anioInicial + 1);
    } else {
      expect(result.current.viewMonth).toBe(mesInicial + 1);
      expect(result.current.viewYear).toBe(anioInicial);
    }
  });

  it("goPrev retrocede al mes anterior", () => {
    const { result } = renderHook(() => useVentasPage(), { wrapper: createWrapper() });
    const mesInicial = result.current.viewMonth;
    const anioInicial = result.current.viewYear;
    act(() => result.current.goPrev());
    if (mesInicial === 1) {
      expect(result.current.viewMonth).toBe(12);
      expect(result.current.viewYear).toBe(anioInicial - 1);
    } else {
      expect(result.current.viewMonth).toBe(mesInicial - 1);
      expect(result.current.viewYear).toBe(anioInicial);
    }
  });

  it("goNext envuelve de diciembre a enero del año siguiente", () => {
    const { result } = renderHook(() => useVentasPage(), { wrapper: createWrapper() });
    // Navegar hasta diciembre
    const stepsToDecember = 12 - result.current.viewMonth;
    for (let i = 0; i < stepsToDecember; i++) {
      act(() => result.current.goNext());
    }
    expect(result.current.viewMonth).toBe(12);
    const anioEnDiciembre = result.current.viewYear;
    act(() => result.current.goNext());
    expect(result.current.viewMonth).toBe(1);
    expect(result.current.viewYear).toBe(anioEnDiciembre + 1);
  });

  it("goPrev envuelve de enero a diciembre del año anterior", () => {
    const { result } = renderHook(() => useVentasPage(), { wrapper: createWrapper() });
    // Navegar hasta enero
    const stepsToJanuary = result.current.viewMonth - 1;
    for (let i = 0; i < stepsToJanuary; i++) {
      act(() => result.current.goPrev());
    }
    expect(result.current.viewMonth).toBe(1);
    const anioEnEnero = result.current.viewYear;
    act(() => result.current.goPrev());
    expect(result.current.viewMonth).toBe(12);
    expect(result.current.viewYear).toBe(anioEnEnero - 1);
  });

  it("handleEditVenta establece editandoVentaId y formVenta", () => {
    const { result } = renderHook(() => useVentasPage(), { wrapper: createWrapper() });
    act(() => result.current.handleEditVenta(makeVenta()));
    expect(result.current.editandoVentaId).toBe(42);
    expect(result.current.formVenta.full_name).toBe("Ana López");
  });

  it("handleCancelVenta limpia la edición", () => {
    const { result } = renderHook(() => useVentasPage(), { wrapper: createWrapper() });
    act(() => result.current.handleEditVenta(makeVenta()));
    act(() => result.current.handleCancelVenta());
    expect(result.current.editandoVentaId).toBeNull();
    expect(result.current.formVenta).toEqual({});
  });

  it("mesNombre incluye el nombre del mes y el año", () => {
    const { result } = renderHook(() => useVentasPage(), { wrapper: createWrapper() });
    expect(result.current.mesNombre).toMatch(/\d{4}/);
    expect(result.current.mesNombre.length).toBeGreaterThan(4);
  });

  it("resultadoImport comienza en null", () => {
    const { result } = renderHook(() => useVentasPage(), { wrapper: createWrapper() });
    expect(result.current.resultadoImport).toBeNull();
  });
});
