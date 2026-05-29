import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "@/modules/metaInbox/components/MessageBubble";
import type { MetaInboxMessage } from "@/types/metaInbox";

const makeMsg = (overrides: Partial<MetaInboxMessage> = {}): MetaInboxMessage => ({
  externalEventId: "evt-1",
  messageExternalId: "msg-1",
  sessionId: "sess-1",
  actorExternalId: "actor-1",
  objectType: "WHATSAPP",
  eventKind: "MESSAGE",
  direction: "INBOUND",
  contentText: "Hola, ¿me pueden ayudar?",
  contentJson: null,
  status: "RECEIVED",
  occurredAt: "2026-05-29T12:00:00Z",
  ...overrides,
});

describe("MessageBubble", () => {
  it("renderiza el texto del mensaje", () => {
    render(<MessageBubble msg={makeMsg()} />);
    expect(screen.getByText("Hola, ¿me pueden ayudar?")).toBeInTheDocument();
  });

  it("muestra '(mensaje sin texto)' cuando no hay texto ni media", () => {
    render(<MessageBubble msg={makeMsg({ contentText: null, contentJson: null })} />);
    expect(screen.getByText("(mensaje sin texto)")).toBeInTheDocument();
  });

  it("no muestra texto '[audio]' cuando hay media de audio", () => {
    const msg = makeMsg({
      contentText: "[audio]",
      contentJson: { mediaType: "audio", mediaUrl: "http://localhost/audio.ogg" },
    });
    render(<MessageBubble msg={msg} />);
    expect(screen.queryByText("[audio]")).not.toBeInTheDocument();
  });

  it("renderiza imagen cuando contentJson tiene mediaType image", () => {
    const msg = makeMsg({
      contentText: "[imagen]",
      contentJson: { mediaType: "image", mediaUrl: "http://localhost/foto.jpg" },
    });
    const { container } = render(<MessageBubble msg={msg} />);
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img?.getAttribute("src")).toBe("http://localhost/foto.jpg");
  });

  it("renderiza audio cuando contentJson tiene mediaType audio", () => {
    const msg = makeMsg({
      contentText: "[audio]",
      contentJson: { mediaType: "audio", mediaUrl: "http://localhost/nota.ogg" },
    });
    const { container } = render(<MessageBubble msg={msg} />);
    const audio = container.querySelector("audio");
    expect(audio).toBeInTheDocument();
    expect(audio?.getAttribute("src")).toBe("http://localhost/nota.ogg");
  });

  it("mensaje entrante no usa clase de saliente", () => {
    const { container } = render(<MessageBubble msg={makeMsg({ direction: "INBOUND" })} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).not.toMatch(/justify-end/);
  });

  it("mensaje saliente tiene clase de alineación derecha", () => {
    const { container } = render(
      <MessageBubble msg={makeMsg({ direction: "OUTGOING" })} />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toMatch(/justify-end/);
  });

  it("no muestra contentText '[imagen]' cuando hay media de imagen", () => {
    const msg = makeMsg({
      contentText: "[imagen]",
      contentJson: { mediaType: "image", mediaUrl: "http://localhost/x.jpg" },
    });
    render(<MessageBubble msg={msg} />);
    expect(screen.queryByText("[imagen]")).not.toBeInTheDocument();
  });
});
