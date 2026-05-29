import { describe, it, expect } from "vitest";
import { formatFecha, formatPrecio, progressInfo } from "@/modules/ventas/utils";

describe("formatFecha", () => {
  it("formatea una fecha ISO a formato es-CL", () => {
    // Mediodía local para evitar desfase por timezone
    const result = formatFecha("2024-06-15T12:00:00");
    expect(result).toMatch(/15/);
    expect(result).toMatch(/06/);
    expect(result).toMatch(/2024/);
  });
});

describe("formatPrecio", () => {
  it("formatea un número como CLP sin decimales", () => {
    const result = formatPrecio(25000);
    expect(result).toContain("25");
    expect(result).toContain("000");
  });
});

describe("progressInfo", () => {
  it("rango máximo devuelve 100%", () => {
    const { percent, label } = progressInfo(50, 3);
    expect(percent).toBe(100);
    expect(label).toContain("máximo");
  });

  it("rango 1: calcula porcentaje hacia 20 pts", () => {
    const { percent, label } = progressInfo(10, 1);
    expect(percent).toBe(50);
    expect(label).toContain("20");
  });

  it("rango 2: calcula porcentaje hacia 35 pts", () => {
    const { percent, label } = progressInfo(27, 2);
    expect(percent).toBeCloseTo(((27 - 20) / 15) * 100, 1);
    expect(label).toContain("35");
  });

  it("no supera 100% aunque los puntos sean mayores al tope", () => {
    const { percent } = progressInfo(100, 1);
    expect(percent).toBe(100);
  });
});
