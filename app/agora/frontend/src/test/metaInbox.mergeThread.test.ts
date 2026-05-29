import { describe, it, expect } from "vitest";
import { mergeThreadIntoList, sortThreads } from "@/modules/metaInbox/utils";
import type { MetaInboxThread } from "@/types/metaInbox";

const base: MetaInboxThread = {
  sessionId: "s1", actorExternalId: "actor1", objectType: "WHATSAPP",
  sourceChannel: null, threadStatus: "OPEN", attentionMode: "N8N",
  threadStage: "inicio", displayName: "Juan", firstName: null, lastName: null,
  phone: "+56912345678", rut: null, address: null, email: null, notes: null,
  city: null, region: null, lastMessageText: "hola", lastDirection: "INCOMING",
  lastMessageAt: "2024-06-15T10:00:00.000Z",
};

describe("mergeThreadIntoList — hilo nuevo", () => {
  it("agrega el hilo si no existe", () => {
    const result = mergeThreadIntoList([], { sessionId: "s1", actorExternalId: "actor1", objectType: "WHATSAPP" });
    expect(result).toHaveLength(1);
    expect(result[0].sessionId).toBe("s1");
  });

  it("no agrega si payload no tiene sessionId", () => {
    const result = mergeThreadIntoList([base], { actorExternalId: "actor2" } as any);
    expect(result).toHaveLength(1);
  });
});

describe("mergeThreadIntoList — hilo existente", () => {
  it("actualiza threadStatus", () => {
    const result = mergeThreadIntoList([base], { sessionId: "s1", threadStatus: "ARCHIVED" });
    expect(result[0].threadStatus).toBe("ARCHIVED");
  });

  it("actualiza lastMessageText", () => {
    const result = mergeThreadIntoList([base], { sessionId: "s1", lastMessageText: "nuevo" });
    expect(result[0].lastMessageText).toBe("nuevo");
  });

  it("usa contentText como fallback de lastMessageText", () => {
    const result = mergeThreadIntoList([base], { sessionId: "s1", contentText: "desde socket" });
    expect(result[0].lastMessageText).toBe("desde socket");
  });

  it("preserva campos no presentes en el payload", () => {
    const result = mergeThreadIntoList([base], { sessionId: "s1", attentionMode: "HUMAN" });
    expect(result[0].displayName).toBe("Juan");
    expect(result[0].phone).toBe("+56912345678");
  });

  it("permite setear phone a null explícitamente", () => {
    const result = mergeThreadIntoList([base], { sessionId: "s1", phone: null });
    expect(result[0].phone).toBeNull();
  });

  it("actualiza whatsappBlockStatus", () => {
    const result = mergeThreadIntoList([base], { sessionId: "s1", whatsappBlockStatus: "blocked" });
    expect(result[0].whatsappBlockStatus).toBe("blocked");
  });
});

describe("sortThreads", () => {
  it("ordena por lastMessageAt descendente", () => {
    const older = { ...base, sessionId: "old", lastMessageAt: "2024-01-01T00:00:00.000Z" };
    const newer = { ...base, sessionId: "new", lastMessageAt: "2024-06-01T00:00:00.000Z" };
    const sorted = sortThreads([older, newer]);
    expect(sorted[0].sessionId).toBe("new");
    expect(sorted[1].sessionId).toBe("old");
  });

  it("no muta el array original", () => {
    const arr = [base];
    const sorted = sortThreads(arr);
    expect(sorted).not.toBe(arr);
  });
});
