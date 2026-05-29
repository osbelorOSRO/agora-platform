import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CatalogoTable } from "@/modules/ventas/components/CatalogoTable";
import { RegistrarVentaModal } from "@/modules/ventas/components/RegistrarVentaModal";
import { CsvImportBanner } from "@/modules/ventas/components/CsvImportBanner";
import type { Offer } from "@/modules/accesos/types/salesRecord";
import { FORM_INICIAL } from "@/modules/ventas/constants";

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeOffer = (overrides: Partial<Offer> = {}): Offer => ({
  id: 1, code: "4FU", modality: "POST_A_POST", level: 5, points: "3", ...overrides,
});

const noop = () => {};

// ── CatalogoTable ─────────────────────────────────────────────────────────────

describe("CatalogoTable", () => {
  const defaultProps = {
    catalogo: [] as Offer[], editandoId: null,
    form: {}, onFormChange: noop, onAgregar: noop,
    onEdit: noop, onCancel: noop, onGuardar: noop, onEliminar: noop,
  };

  it("muestra el título de la tabla", () => {
    render(<CatalogoTable {...defaultProps} />);
    expect(screen.getByText("Catálogo de ofertas")).toBeInTheDocument();
  });

  it("muestra estado vacío cuando no hay ofertas", () => {
    render(<CatalogoTable {...defaultProps} />);
    expect(screen.getByText("Sin ofertas en el catálogo.")).toBeInTheDocument();
  });

  it("renderiza una fila por oferta", () => {
    render(<CatalogoTable {...defaultProps} catalogo={[makeOffer(), makeOffer({ id: 2, code: "5FU" })]} />);
    expect(screen.getByText("4FU")).toBeInTheDocument();
    expect(screen.getByText("5FU")).toBeInTheDocument();
  });

  it("llama onAgregar al hacer click en Agregar", () => {
    const onAgregar = vi.fn();
    render(<CatalogoTable {...defaultProps} onAgregar={onAgregar} />);
    fireEvent.click(screen.getByText("Agregar"));
    expect(onAgregar).toHaveBeenCalledOnce();
  });

  it("Agregar deshabilitado cuando editandoId no es null", () => {
    render(<CatalogoTable {...defaultProps} editandoId={1} />);
    expect(screen.getByText("Agregar").closest("button")).toBeDisabled();
  });

  it("muestra botones Editar y Eliminar cuando no se está editando", () => {
    render(<CatalogoTable {...defaultProps} catalogo={[makeOffer()]} />);
    expect(screen.getByLabelText("Editar")).toBeInTheDocument();
    expect(screen.getByLabelText("Eliminar")).toBeInTheDocument();
  });

  it("llama onEdit con la oferta al hacer click en Editar", () => {
    const onEdit = vi.fn();
    const oferta = makeOffer();
    render(<CatalogoTable {...defaultProps} catalogo={[oferta]} onEdit={onEdit} />);
    fireEvent.click(screen.getByLabelText("Editar"));
    expect(onEdit).toHaveBeenCalledWith(oferta);
  });

  it("llama onEliminar con el id al hacer click en Eliminar", () => {
    const onEliminar = vi.fn();
    render(<CatalogoTable {...defaultProps} catalogo={[makeOffer({ id: 7 })]} onEliminar={onEliminar} />);
    fireEvent.click(screen.getByLabelText("Eliminar"));
    expect(onEliminar).toHaveBeenCalledWith(7);
  });

  it("muestra inputs de edición cuando editandoId coincide", () => {
    render(
      <CatalogoTable {...defaultProps} catalogo={[makeOffer({ id: 1 })]} editandoId={1} form={{ code: "4FU" }} />,
    );
    expect(screen.getByLabelText("Nivel")).toBeInTheDocument();
    expect(screen.getByLabelText("Puntos")).toBeInTheDocument();
  });

  it("muestra botones Guardar y Cancelar en modo edición", () => {
    render(
      <CatalogoTable {...defaultProps} catalogo={[makeOffer({ id: 1 })]} editandoId={1} form={{}} />,
    );
    expect(screen.getByLabelText("Guardar")).toBeInTheDocument();
    expect(screen.getByLabelText("Cancelar")).toBeInTheDocument();
  });

  it("llama onGuardar al hacer click en Guardar", () => {
    const onGuardar = vi.fn();
    render(
      <CatalogoTable {...defaultProps} catalogo={[makeOffer({ id: 1 })]} editandoId={1} form={{}} onGuardar={onGuardar} />,
    );
    fireEvent.click(screen.getByLabelText("Guardar"));
    expect(onGuardar).toHaveBeenCalledOnce();
  });

  it("llama onCancel al hacer click en Cancelar", () => {
    const onCancel = vi.fn();
    render(
      <CatalogoTable {...defaultProps} catalogo={[makeOffer({ id: 1 })]} editandoId={1} form={{}} onCancel={onCancel} />,
    );
    fireEvent.click(screen.getByLabelText("Cancelar"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("muestra el total de ofertas en el footer", () => {
    render(<CatalogoTable {...defaultProps} catalogo={[makeOffer(), makeOffer({ id: 2 })]} />);
    expect(screen.getByText(/Total: 2 ofertas/)).toBeInTheDocument();
  });
});

// ── RegistrarVentaModal ───────────────────────────────────────────────────────

describe("RegistrarVentaModal", () => {
  const defaultProps = {
    form: { ...FORM_INICIAL },
    cargando: false,
    onFormChange: noop,
    onGuardar: noop,
    onClose: noop,
  };

  it("muestra el título del modal", () => {
    render(<RegistrarVentaModal {...defaultProps} />);
    expect(screen.getByText("Registrar venta")).toBeInTheDocument();
  });

  it("renderiza todos los campos del formulario", () => {
    render(<RegistrarVentaModal {...defaultProps} />);
    expect(screen.getByPlaceholderText("12345678-9")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("912345678")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Av. Principal 123")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("C-001")).toBeInTheDocument();
  });

  it("llama onClose al hacer click en el botón X", () => {
    const onClose = vi.fn();
    render(<RegistrarVentaModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Cerrar"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("llama onClose al hacer click en Cancelar", () => {
    const onClose = vi.fn();
    render(<RegistrarVentaModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("Cancelar"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("llama onGuardar al hacer click en Registrar", () => {
    const onGuardar = vi.fn();
    render(<RegistrarVentaModal {...defaultProps} onGuardar={onGuardar} />);
    fireEvent.click(screen.getByText("Registrar"));
    expect(onGuardar).toHaveBeenCalledOnce();
  });

  it("muestra 'Guardando…' y deshabilita el botón cuando cargando=true", () => {
    render(<RegistrarVentaModal {...defaultProps} cargando={true} />);
    const btn = screen.getByText("Guardando…");
    expect(btn).toBeInTheDocument();
    expect(btn.closest("button")).toBeDisabled();
  });

  it("llama onFormChange al cambiar el campo RUN", () => {
    const onFormChange = vi.fn();
    render(<RegistrarVentaModal {...defaultProps} onFormChange={onFormChange} />);
    fireEvent.change(screen.getByPlaceholderText("12345678-9"), { target: { value: "11111111-1" } });
    expect(onFormChange).toHaveBeenCalledWith({ run: "11111111-1" });
  });

  it("llama onFormChange al cambiar el nombre completo", () => {
    const onFormChange = vi.fn();
    render(<RegistrarVentaModal {...defaultProps} onFormChange={onFormChange} />);
    fireEvent.change(screen.getByPlaceholderText("Juan Pérez"), { target: { value: "Ana López" } });
    expect(onFormChange).toHaveBeenCalledWith({ full_name: "Ana López" });
  });
});

// ── CsvImportBanner ───────────────────────────────────────────────────────────

describe("CsvImportBanner", () => {
  it("muestra el resumen de importación exitosa", () => {
    render(<CsvImportBanner result={{ inserted: 10, total: 10, errors: [] }} onClose={noop} />);
    expect(screen.getByText("10 de 10 filas importadas correctamente")).toBeInTheDocument();
  });

  it("muestra errores cuando los hay", () => {
    render(
      <CsvImportBanner
        result={{ inserted: 8, total: 10, errors: [{ index: 2, error: "RUN inválido" }, { index: 5, error: "Fecha requerida" }] }}
        onClose={noop}
      />,
    );
    expect(screen.getByText(/RUN inválido/)).toBeInTheDocument();
    expect(screen.getByText(/Fecha requerida/)).toBeInTheDocument();
  });

  it("llama onClose al hacer click en el botón de cerrar", () => {
    const onClose = vi.fn();
    render(<CsvImportBanner result={{ inserted: 5, total: 5, errors: [] }} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Cerrar resultado"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("aplica estilo verde cuando no hay errores", () => {
    const { container } = render(
      <CsvImportBanner result={{ inserted: 5, total: 5, errors: [] }} onClose={noop} />,
    );
    expect(container.firstChild).toHaveClass("border-green-800");
  });

  it("aplica estilo amarillo cuando hay errores", () => {
    const { container } = render(
      <CsvImportBanner result={{ inserted: 3, total: 5, errors: [{ index: 0, error: "error" }] }} onClose={noop} />,
    );
    expect(container.firstChild).toHaveClass("border-yellow-800");
  });
});
