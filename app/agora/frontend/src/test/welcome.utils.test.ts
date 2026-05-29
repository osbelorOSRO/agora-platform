import { describe, it, expect } from "vitest";
import { buildWeeklyBuckets, formatDateLabel } from "@/modules/welcome/utils";

describe("buildWeeklyBuckets", () => {
  it("devuelve 8 buckets por defecto", () => {
    const buckets = buildWeeklyBuckets([]);
    expect(buckets).toHaveLength(8);
  });

  it("todos los buckets empiezan en 0 cuando no hay filas", () => {
    const buckets = buildWeeklyBuckets([]);
    expect(buckets.every((b) => b.total === 0)).toBe(true);
  });

  it("cada bucket tiene weekStart y weekEnd como strings de fecha", () => {
    const buckets = buildWeeklyBuckets([]);
    buckets.forEach((b) => {
      expect(b.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(b.weekEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it("weekEnd siempre es 6 días después de weekStart", () => {
    const buckets = buildWeeklyBuckets([]);
    buckets.forEach((b) => {
      const start = new Date(b.weekStart + "T12:00:00");
      const end = new Date(b.weekEnd + "T12:00:00");
      const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
      expect(diffDays).toBe(6);
    });
  });

  it("asigna threads_distintos al bucket correcto", () => {
    const buckets = buildWeeklyBuckets([]);
    if (buckets.length === 0) return;
    const targetBucket = buckets[0];
    const row = { semana_inicio: targetBucket.weekStart, semana_fin: targetBucket.weekEnd, total_eventos: 0, threads_creados: 0, mensajes_entrantes: 0, mensajes_salientes: 0, threads_distintos: 42 };
    const result = buildWeeklyBuckets([row]);
    expect(result[0].total).toBe(42);
  });

  it("ignora filas con fechas inválidas", () => {
    const row = { semana_inicio: "no-es-fecha", semana_fin: "no-es-fecha", total_eventos: 0, threads_creados: 0, mensajes_entrantes: 0, mensajes_salientes: 0, threads_distintos: 99 };
    const buckets = buildWeeklyBuckets([row]);
    expect(buckets.every((b) => b.total === 0)).toBe(true);
  });
});

describe("formatDateLabel", () => {
  it("devuelve día y mes en formato es-CL", () => {
    const result = formatDateLabel("2024-06-15");
    expect(result).toMatch(/15/);
  });

  it("no lanza con fechas válidas", () => {
    expect(() => formatDateLabel("2024-01-01")).not.toThrow();
    expect(() => formatDateLabel("2024-12-31")).not.toThrow();
  });
});
