import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PuntosCard } from "@/modules/ventas/components/PuntosCard";
import type { SaleMonthlyPoints } from "@/modules/accesos/types/salesRecord";

const makePuntos = (overrides: Partial<SaleMonthlyPoints> = {}): SaleMonthlyPoints => ({
  year: 2026,
  month: 5,
  total_points: 42,
  active_range: 1,
  ...overrides,
});

const noop = () => {};

describe("PuntosCard", () => {
  it("muestra el nombre del mes", () => {
    render(<PuntosCard mesNombre="Mayo 2026" puntos={null} onPrev={noop} onNext={noop} />);
    expect(screen.getByText("Mayo 2026")).toBeInTheDocument();
  });

  it("muestra 0 puntos cuando puntos es null", () => {
    render(<PuntosCard mesNombre="Mayo 2026" puntos={null} onPrev={noop} onNext={noop} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("muestra el total de puntos del mes", () => {
    render(
      <PuntosCard mesNombre="Mayo 2026" puntos={makePuntos({ total_points: 87 })} onPrev={noop} onNext={noop} />,
    );
    expect(screen.getByText("87")).toBeInTheDocument();
  });

  it("llama onPrev al hacer click en el botón de mes anterior", () => {
    const onPrev = vi.fn();
    render(<PuntosCard mesNombre="Mayo 2026" puntos={null} onPrev={onPrev} onNext={noop} />);
    fireEvent.click(screen.getByLabelText("Mes anterior"));
    expect(onPrev).toHaveBeenCalledOnce();
  });

  it("llama onNext al hacer click en el botón de mes siguiente", () => {
    const onNext = vi.fn();
    render(<PuntosCard mesNombre="Mayo 2026" puntos={null} onPrev={noop} onNext={onNext} />);
    fireEvent.click(screen.getByLabelText("Mes siguiente"));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("muestra la etiqueta de rango según active_range", async () => {
    const { RANGO_LABELS } = await import("@/modules/accesos/types/salesRecord");
    render(
      <PuntosCard mesNombre="Mayo 2026" puntos={makePuntos({ active_range: 2 })} onPrev={noop} onNext={noop} />,
    );
    expect(screen.getByText(RANGO_LABELS[2])).toBeInTheDocument();
  });

  it("muestra la barra de progreso", () => {
    const { container } = render(
      <PuntosCard mesNombre="Mayo 2026" puntos={makePuntos({ total_points: 50 })} onPrev={noop} onNext={noop} />,
    );
    const bar = container.querySelector(".bg-primary.h-1\\.5.rounded-full");
    expect(bar).toBeInTheDocument();
  });

  it("muestra texto 'puntos acumulados'", () => {
    render(<PuntosCard mesNombre="Mayo 2026" puntos={null} onPrev={noop} onNext={noop} />);
    expect(screen.getByText("puntos acumulados")).toBeInTheDocument();
  });
});
