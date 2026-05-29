import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Componente que lanza intencionalmente
const Thrower = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error("error de prueba");
  return <div>contenido ok</div>;
};

// Suprime console.error durante los tests de error boundaries
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("ErrorBoundary — modo section", () => {
  it("renderiza children cuando no hay error", () => {
    render(
      <ErrorBoundary variant="section">
        <div>sin error</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("sin error")).toBeInTheDocument();
  });

  it("muestra fallback de error cuando el hijo lanza", () => {
    render(
      <ErrorBoundary variant="section">
        <Thrower shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/error de prueba/i)).toBeInTheDocument();
  });

  it("el botón Reintentar resetea el boundary", () => {
    let shouldThrow = true;
    // Componente controlado por referencia externa al render
    const Controlled = () => {
      if (shouldThrow) throw new Error("error controlado");
      return <div>contenido ok</div>;
    };
    const { rerender } = render(
      <ErrorBoundary variant="section">
        <Controlled />
      </ErrorBoundary>,
    );
    // Está mostrando el error
    expect(screen.getByText(/error controlado/i)).toBeInTheDocument();
    // Desactivar el throw antes del reset
    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }));
    // Re-render para que React procese el estado limpio
    rerender(
      <ErrorBoundary variant="section">
        <Controlled />
      </ErrorBoundary>,
    );
    expect(screen.getByText("contenido ok")).toBeInTheDocument();
  });
});

describe("ErrorBoundary — fallback personalizado", () => {
  it("usa el fallback prop si se provee", () => {
    render(
      <ErrorBoundary fallback={<span>mi fallback</span>}>
        <Thrower shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText("mi fallback")).toBeInTheDocument();
  });
});

describe("ErrorBoundary — ChunkLoadError", () => {
  it("muestra ChunkErrorPage para errores de chunk", () => {
    const chunkErr = Object.assign(new Error("chunk"), { name: "ChunkLoadError" });
    const Bomb = () => { throw chunkErr; };
    render(
      <ErrorBoundary variant="section">
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/nueva versión disponible/i)).toBeInTheDocument();
  });
});
