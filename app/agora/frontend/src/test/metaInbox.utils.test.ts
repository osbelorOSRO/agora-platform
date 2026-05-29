import { describe, it, expect } from "vitest";
import {
  formatRelativeTs,
  normalizeText,
  stageLabel,
  compactActorId,
} from "@/modules/metaInbox/utils";
import type { MetaInboxThread } from "@/types/metaInbox";

describe("formatRelativeTs", () => {
  it("devuelve vacío para valor nulo", () => {
    expect(formatRelativeTs(null)).toBe("");
    expect(formatRelativeTs(undefined)).toBe("");
  });

  it("devuelve 'hace 1 min' para timestamps recientes", () => {
    const ts = new Date(Date.now() - 30_000).toISOString();
    expect(formatRelativeTs(ts)).toBe("hace 1 min");
  });

  it("devuelve horas para timestamps de horas atrás", () => {
    const ts = new Date(Date.now() - 3 * 3600_000).toISOString();
    expect(formatRelativeTs(ts)).toContain("3 h");
  });

  it("devuelve días para timestamps de días atrás", () => {
    const ts = new Date(Date.now() - 2 * 86_400_000).toISOString();
    expect(formatRelativeTs(ts)).toContain("2 d");
  });
});

describe("normalizeText", () => {
  it("elimina tildes y convierte a minúsculas", () => {
    expect(normalizeText("Ángel")).toBe("angel");
    expect(normalizeText("HÉROE")).toBe("heroe");
    expect(normalizeText("café")).toBe("cafe");
  });

  it("maneja nulo y vacío sin error", () => {
    expect(normalizeText(null)).toBe("");
    expect(normalizeText(undefined)).toBe("");
    expect(normalizeText("")).toBe("");
  });
});

describe("stageLabel", () => {
  it("convierte snake_case a Title Case", () => {
    expect(stageLabel("intencion_ofertas")).toBe("Intencion Ofertas");
    expect(stageLabel("inicio")).toBe("Inicio");
  });

  it("devuelve 'Sin Etapa' para valor nulo", () => {
    expect(stageLabel(null)).toBe("Sin Etapa");
  });
});

describe("compactActorId", () => {
  const base: MetaInboxThread = {
    sessionId: "s1", actorExternalId: "56912345678@s.whatsapp.net",
    objectType: "WHATSAPP", sourceChannel: null, threadStatus: "OPEN",
    attentionMode: "N8N", threadStage: "inicio", displayName: "Test",
    firstName: null, lastName: null, phone: null, rut: null,
    address: null, email: null, notes: null, city: null, region: null,
    lastMessageText: null, lastDirection: "INCOMING", lastMessageAt: new Date().toISOString(),
  };

  it("prefiere el campo phone cuando existe", () => {
    expect(compactActorId({ ...base, phone: "+56912345678" })).toBe("+56912345678");
  });

  it("extrae número de teléfono de JID de WhatsApp", () => {
    expect(compactActorId(base)).toBe("56912345678");
  });

  it("trunca actorExternalId largo", () => {
    const long = { ...base, actorExternalId: "a".repeat(30), phone: null };
    const result = compactActorId(long);
    expect(result).toContain("...");
    expect(result.length).toBeLessThan(30);
  });
});
