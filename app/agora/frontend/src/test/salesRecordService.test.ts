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
  obtenerVentas,
  crearVenta,
  actualizarVenta,
  eliminarVenta,
  obtenerPuntosMes,
  obtenerCatalogo,
  importarVentasCSV,
  crearOferta,
  actualizarOferta,
  eliminarOferta,
  obtenerMatrizPrecios,
  crearPrecioNivel,
  actualizarPrecioNivel,
  eliminarPrecioNivel,
} from "@/modules/accesos/services/salesRecordService";

const mock = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

beforeEach(() => vi.clearAllMocks());

// ─── obtenerVentas ────────────────────────────────────────────────────────────

describe("obtenerVentas", () => {
  it("GET /sales-record sin query string cuando no hay params", async () => {
    mock.get.mockResolvedValueOnce({ data: [] });
    const result = await obtenerVentas();
    expect(result).toEqual([]);
    const url = mock.get.mock.calls[0][0] as string;
    expect(url).toMatch(/\/sales-record$/);
  });

  it("agrega year y month a la query string", async () => {
    mock.get.mockResolvedValueOnce({ data: [] });
    await obtenerVentas(2024, 6);
    const url = mock.get.mock.calls[0][0] as string;
    expect(url).toContain("year=2024");
    expect(url).toContain("month=6");
  });

  it("devuelve los registros de la respuesta", async () => {
    const ventas = [{ id: 1, full_name: "Juan" }];
    mock.get.mockResolvedValueOnce({ data: ventas });
    const result = await obtenerVentas();
    expect(result).toEqual(ventas);
  });
});

// ─── crearVenta ───────────────────────────────────────────────────────────────

describe("crearVenta", () => {
  const dto = {
    fecha: "2024-06-15",
    run: "12345678-9",
    full_name: "Juan Pérez",
    phone: "+56912345678",
    address: "Av. Test 123",
    city: "Santiago",
    province: "Metropolitana",
    country: "Chile",
    contract_number: "C-001",
    modality: "POST_A_POST" as const,
    offers_code: "OF-01",
  };

  it("POST a /sales-record y devuelve el registro creado", async () => {
    mock.post.mockResolvedValueOnce({ data: { id: 1, ...dto } });
    const result = await crearVenta(dto);
    expect(result.id).toBe(1);
    expect(mock.post).toHaveBeenCalledWith(
      expect.stringContaining("/sales-record"),
      dto,
      expect.any(Object),
    );
  });
});

// ─── actualizarVenta ──────────────────────────────────────────────────────────

describe("actualizarVenta", () => {
  it("PATCH a /sales-record/:id con los campos correctos", async () => {
    mock.patch.mockResolvedValueOnce({ data: { id: 5, full_name: "Nuevo Nombre" } });
    const result = await actualizarVenta(5, { full_name: "Nuevo Nombre" });
    expect(result.full_name).toBe("Nuevo Nombre");
    const url = mock.patch.mock.calls[0][0] as string;
    expect(url).toContain("/sales-record/5");
  });
});

// ─── eliminarVenta ────────────────────────────────────────────────────────────

describe("eliminarVenta", () => {
  it("DELETE a /sales-record/:id", async () => {
    mock.delete.mockResolvedValueOnce({ data: undefined });
    await eliminarVenta(3);
    const url = mock.delete.mock.calls[0][0] as string;
    expect(url).toContain("/sales-record/3");
  });
});

// ─── obtenerPuntosMes ─────────────────────────────────────────────────────────

describe("obtenerPuntosMes", () => {
  it("llama a /monthly-points/:year/:month y devuelve datos", async () => {
    const data = { year: 2024, month: 6, total_points: 10 };
    mock.get.mockResolvedValueOnce({ data });
    const result = await obtenerPuntosMes(2024, 6);
    expect(result.total_points).toBe(10);
    const url = mock.get.mock.calls[0][0] as string;
    expect(url).toContain("/monthly-points/2024/6");
  });
});

// ─── obtenerCatalogo ──────────────────────────────────────────────────────────

describe("obtenerCatalogo", () => {
  it("devuelve array de ofertas del catálogo", async () => {
    const ofertas = [{ id: 1, code: "OF-01", modality: "ALTA", level: 1, points: 5 }];
    mock.get.mockResolvedValueOnce({ data: ofertas });
    const result = await obtenerCatalogo();
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe("OF-01");
  });
});

// ─── importarVentasCSV ────────────────────────────────────────────────────────

describe("importarVentasCSV", () => {
  const HEADER = "fecha,run,full_name,phone,address,city,province,country,contract_number,modality,offers_code";

  const buildCSV = (...rows: string[]) => [HEADER, ...rows].join("\n");

  const defaultRow =
    "15-06-24,12345678-9,Juan Pérez,+56912345678,Av Test 123,Santiago,RM,Chile,C-001,POST A POST,OF-01";

  it("parsea CSV válido y POST a /sales-record/bulk", async () => {
    mock.post.mockResolvedValueOnce({ data: { total: 1, inserted: 1, errors: [] } });
    const file = new File([buildCSV(defaultRow)], "ventas.csv", { type: "text/csv" });
    const result = await importarVentasCSV(file);
    expect(result.inserted).toBe(1);
    const url = mock.post.mock.calls[0][0] as string;
    expect(url).toContain("/sales-record/bulk");
  });

  it("convierte modalidad POST A POST → POST_A_POST", async () => {
    mock.post.mockResolvedValueOnce({ data: { total: 1, inserted: 1, errors: [] } });
    const file = new File([buildCSV(defaultRow)], "test.csv", { type: "text/csv" });
    await importarVentasCSV(file);
    const body = mock.post.mock.calls[0][1] as { records: Array<{ modality: string }> };
    expect(body.records[0].modality).toBe("POST_A_POST");
  });

  it("convierte modalidad PRE A POST → PRE_A_POST", async () => {
    const row = "01/01/2025,11111111-1,Pedro,+56999999999,Calle 1,Valpo,Valpo,Chile,C-002,PRE A POST,OF-02";
    mock.post.mockResolvedValueOnce({ data: { total: 1, inserted: 1, errors: [] } });
    const file = new File([buildCSV(row)], "test.csv", { type: "text/csv" });
    await importarVentasCSV(file);
    const body = mock.post.mock.calls[0][1] as { records: Array<{ modality: string }> };
    expect(body.records[0].modality).toBe("PRE_A_POST");
  });

  it("normaliza fecha DD-MM-YY a YYYY-MM-DD", async () => {
    mock.post.mockResolvedValueOnce({ data: { total: 1, inserted: 1, errors: [] } });
    const file = new File([buildCSV(defaultRow)], "test.csv", { type: "text/csv" });
    await importarVentasCSV(file);
    const body = mock.post.mock.calls[0][1] as { records: Array<{ fecha: string }> };
    expect(body.records[0].fecha).toBe("2024-06-15");
  });

  it("normaliza fecha DD/MM/YYYY a YYYY-MM-DD", async () => {
    const row = "15/06/2024,12345678-9,Juan,+56912345678,Av,Santiago,RM,Chile,C-001,ALTA,OF-01";
    mock.post.mockResolvedValueOnce({ data: { total: 1, inserted: 1, errors: [] } });
    const file = new File([buildCSV(row)], "test.csv", { type: "text/csv" });
    await importarVentasCSV(file);
    const body = mock.post.mock.calls[0][1] as { records: Array<{ fecha: string }> };
    expect(body.records[0].fecha).toBe("2024-06-15");
  });

  it("lanza error si el archivo no tiene filas de datos", async () => {
    const file = new File([HEADER], "empty.csv", { type: "text/csv" });
    await expect(importarVentasCSV(file)).rejects.toThrow("no tiene datos");
  });

  it("lanza error si la modalidad es desconocida", async () => {
    const row = "01-01-24,111,Juan,+56,Av 1,City,Prov,Chile,C-001,INVALIDA,OF-01";
    const file = new File([buildCSV(row)], "test.csv", { type: "text/csv" });
    await expect(importarVentasCSV(file)).rejects.toThrow("modalidad desconocida");
  });

  it("tolera cabecera con typo 'adress' → 'address'", async () => {
    const header = "fecha,run,full_name,phone,adress,city,province,country,contract_number,modality,offers_code";
    const row = "15-06-24,12345678-9,Juan,+56912345678,Av Test,Santiago,RM,Chile,C-001,ALTA,OF-01";
    mock.post.mockResolvedValueOnce({ data: { total: 1, inserted: 1, errors: [] } });
    const file = new File([[header, row].join("\n")], "test.csv", { type: "text/csv" });
    const result = await importarVentasCSV(file);
    expect(result.inserted).toBe(1);
  });
});

// ─── crearOferta ──────────────────────────────────────────────────────────────

describe("crearOferta", () => {
  it("POST a /sales-record/catalog y devuelve oferta creada", async () => {
    const dto = { code: "OF-99", modality: "ALTA" as const, level: 2, points: 10 };
    mock.post.mockResolvedValueOnce({ data: { id: 99, ...dto } });
    const result = await crearOferta(dto);
    expect(result.id).toBe(99);
    const url = mock.post.mock.calls[0][0] as string;
    expect(url).toContain("/sales-record/catalog");
  });
});

// ─── actualizarOferta ─────────────────────────────────────────────────────────

describe("actualizarOferta", () => {
  it("PATCH a /sales-record/catalog/:id", async () => {
    mock.patch.mockResolvedValueOnce({ data: { id: 5, points: 20 } });
    const result = await actualizarOferta(5, { points: 20 });
    expect(result.points).toBe(20);
    const url = mock.patch.mock.calls[0][0] as string;
    expect(url).toContain("/sales-record/catalog/5");
  });
});

// ─── eliminarOferta ───────────────────────────────────────────────────────────

describe("eliminarOferta", () => {
  it("DELETE a /sales-record/catalog/:id", async () => {
    mock.delete.mockResolvedValueOnce({ data: undefined });
    await eliminarOferta(7);
    const url = mock.delete.mock.calls[0][0] as string;
    expect(url).toContain("/sales-record/catalog/7");
  });
});

// ─── obtenerMatrizPrecios ─────────────────────────────────────────────────────

describe("obtenerMatrizPrecios", () => {
  it("GET /sales-record/price-matrix y devuelve niveles", async () => {
    const data = [{ id: 1, level: 1, range: 20, price: 5000 }];
    mock.get.mockResolvedValueOnce({ data });
    const result = await obtenerMatrizPrecios();
    expect(result[0].level).toBe(1);
    const url = mock.get.mock.calls[0][0] as string;
    expect(url).toContain("/sales-record/price-matrix");
  });
});

// ─── crearPrecioNivel ─────────────────────────────────────────────────────────

describe("crearPrecioNivel", () => {
  it("POST a /sales-record/price-matrix y devuelve nivel creado", async () => {
    const dto = { level: 3, range: 50, price: 15000 };
    mock.post.mockResolvedValueOnce({ data: { id: 3, ...dto } });
    const result = await crearPrecioNivel(dto);
    expect(result.id).toBe(3);
  });
});

// ─── actualizarPrecioNivel ────────────────────────────────────────────────────

describe("actualizarPrecioNivel", () => {
  it("PATCH a /sales-record/price-matrix/:id", async () => {
    mock.patch.mockResolvedValueOnce({ data: { id: 2, price: 9000 } });
    const result = await actualizarPrecioNivel(2, { price: 9000 });
    expect(result.price).toBe(9000);
    const url = mock.patch.mock.calls[0][0] as string;
    expect(url).toContain("/sales-record/price-matrix/2");
  });
});

// ─── eliminarPrecioNivel ──────────────────────────────────────────────────────

describe("eliminarPrecioNivel", () => {
  it("DELETE a /sales-record/price-matrix/:id", async () => {
    mock.delete.mockResolvedValueOnce({ data: undefined });
    await eliminarPrecioNivel(4);
    const url = mock.delete.mock.calls[0][0] as string;
    expect(url).toContain("/sales-record/price-matrix/4");
  });
});
