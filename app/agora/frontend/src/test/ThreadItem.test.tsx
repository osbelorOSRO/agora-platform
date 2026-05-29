import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThreadItem } from "@/modules/metaInbox/components/ThreadItem";
import type { MetaInboxThread } from "@/types/metaInbox";

const makeThread = (overrides: Partial<MetaInboxThread> = {}): MetaInboxThread => ({
  sessionId: "sess-1",
  actorExternalId: "56912345678@s.whatsapp.net",
  objectType: "WHATSAPP",
  sourceChannel: "WHATSAPP",
  threadStatus: "OPEN",
  attentionMode: "BOT",
  threadStage: "LEAD",
  displayName: "Ana García",
  firstName: "Ana",
  lastName: "García",
  phone: "+56912345678",
  rut: null,
  address: null,
  email: null,
  notes: null,
  city: null,
  region: null,
  lastMessageText: "Hola, ¿me pueden ayudar?",
  lastDirection: "INBOUND",
  lastMessageAt: "2026-05-29T12:00:00Z",
  ...overrides,
});

const noop = () => {};
const defaultProps = {
  active: false,
  menuOpen: false,
  onSelect: noop,
  onOpenMenu: noop,
  onCloseMenu: noop,
  onViewDetail: noop,
  onReopen: noop,
};

describe("ThreadItem", () => {
  it("muestra el displayName cuando es útil", () => {
    render(<ThreadItem thread={makeThread()} {...defaultProps} />);
    expect(screen.getByText("Ana García")).toBeInTheDocument();
  });

  it("muestra el último mensaje", () => {
    render(<ThreadItem thread={makeThread()} {...defaultProps} />);
    expect(screen.getByText("Hola, ¿me pueden ayudar?")).toBeInTheDocument();
  });

  it("muestra '(sin texto)' cuando lastMessageText es null", () => {
    render(<ThreadItem thread={makeThread({ lastMessageText: null })} {...defaultProps} />);
    expect(screen.getByText("(sin texto)")).toBeInTheDocument();
  });

  it("llama onSelect al hacer click en el hilo", () => {
    const onSelect = vi.fn();
    render(<ThreadItem thread={makeThread()} {...defaultProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Ana García"));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("llama onOpenMenu al hacer click en el botón de opciones (menu cerrado)", () => {
    const onOpenMenu = vi.fn();
    render(
      <ThreadItem thread={makeThread()} {...defaultProps} menuOpen={false} onOpenMenu={onOpenMenu} />,
    );
    fireEvent.click(screen.getByLabelText("Opciones del hilo"));
    expect(onOpenMenu).toHaveBeenCalledOnce();
  });

  it("llama onCloseMenu al hacer click en el botón de opciones (menu abierto)", () => {
    const onCloseMenu = vi.fn();
    render(
      <ThreadItem thread={makeThread()} {...defaultProps} menuOpen={true} onCloseMenu={onCloseMenu} />,
    );
    fireEvent.click(screen.getByLabelText("Opciones del hilo"));
    expect(onCloseMenu).toHaveBeenCalledOnce();
  });

  it("muestra 'Ver detalle' cuando el menu está abierto", () => {
    render(<ThreadItem thread={makeThread()} {...defaultProps} menuOpen={true} />);
    expect(screen.getByText("Ver detalle")).toBeInTheDocument();
  });

  it("no muestra el menu cuando menuOpen es false", () => {
    render(<ThreadItem thread={makeThread()} {...defaultProps} menuOpen={false} />);
    expect(screen.queryByText("Ver detalle")).not.toBeInTheDocument();
  });

  it("muestra 'Nueva atencion' para threads CLOSED", () => {
    render(
      <ThreadItem thread={makeThread({ threadStatus: "CLOSED" })} {...defaultProps} menuOpen={true} />,
    );
    expect(screen.getByText("Nueva atencion")).toBeInTheDocument();
  });

  it("muestra 'Nueva atencion' para threads ARCHIVED", () => {
    render(
      <ThreadItem thread={makeThread({ threadStatus: "ARCHIVED" })} {...defaultProps} menuOpen={true} />,
    );
    expect(screen.getByText("Nueva atencion")).toBeInTheDocument();
  });

  it("no muestra 'Nueva atencion' para threads OPEN", () => {
    render(
      <ThreadItem thread={makeThread({ threadStatus: "OPEN" })} {...defaultProps} menuOpen={true} />,
    );
    expect(screen.queryByText("Nueva atencion")).not.toBeInTheDocument();
  });

  it("llama onViewDetail al hacer click en 'Ver detalle'", () => {
    const onViewDetail = vi.fn();
    render(
      <ThreadItem
        thread={makeThread()}
        {...defaultProps}
        menuOpen={true}
        onViewDetail={onViewDetail}
      />,
    );
    fireEvent.click(screen.getByText("Ver detalle"));
    expect(onViewDetail).toHaveBeenCalledOnce();
  });

  it("muestra el título del marketplace para threads de Facebook con metadata", () => {
    const thread = makeThread({
      objectType: "FACEBOOK",
      metadata: { marketplace: { title: "Sofá 3 plazas" } },
    });
    render(<ThreadItem thread={thread} {...defaultProps} />);
    expect(screen.getByText("Sofá 3 plazas")).toBeInTheDocument();
  });

  it("no muestra marketplace para threads sin metadata de marketplace", () => {
    const thread = makeThread({ objectType: "FACEBOOK", metadata: {} });
    render(<ThreadItem thread={thread} {...defaultProps} />);
    expect(screen.queryByText("Sofá 3 plazas")).not.toBeInTheDocument();
  });

  it("usa el actorExternalId como fallback cuando displayName es 'nuevo' y no hay phone", () => {
    const thread = makeThread({
      displayName: "Nuevo",
      phone: null,
      actorExternalId: "56987654321@s.whatsapp.net",
    });
    render(<ThreadItem thread={thread} {...defaultProps} />);
    // compactActorId extrae el número del JID cuando phone es null
    expect(screen.getByText("56987654321")).toBeInTheDocument();
  });
});
