import React, { useRef } from "react";
import { Upload, Trash2, X } from "lucide-react";
import { useGaleriaImagenes } from "../hooks/useGaleriaImagenes";
import type { ImagenGaleria } from "../types";

interface Props {
  onSeleccionar: (img: ImagenGaleria) => void;
  seleccionadaId?: number | null;
  onClose: () => void;
}

export const GaleriaImagenes: React.FC<Props> = ({
  onSeleccionar,
  seleccionadaId,
  onClose,
}) => {
  const { imagenes, isLoading, subiendo, subir, eliminar } =
    useGaleriaImagenes();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";
    try {
      await subir(files);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al subir imágenes");
    }
  };

  const handleEliminar = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Eliminar esta imagen de la galería?")) return;
    await eliminar(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="flex w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
            Galería de imágenes
          </h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
              className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-card hover:text-white disabled:opacity-40"
            >
              <Upload size={13} />
              {subiendo ? "Subiendo…" : "Subir imágenes"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFiles}
            />
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-white transition"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="max-h-[60vh] overflow-y-auto p-4 scrollbar-custom">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Cargando galería…
            </p>
          ) : imagenes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sin imágenes. Sube la primera con el botón de arriba.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {imagenes.map((img) => (
                <div
                  key={img.id}
                  onClick={() => onSeleccionar(img)}
                  className={`group relative cursor-pointer overflow-hidden rounded-xl border-2 transition ${
                    seleccionadaId === img.id
                      ? "border-primary"
                      : "border-transparent hover:border-border"
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.nombre}
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                  />
                  <button
                    type="button"
                    onClick={(e) => handleEliminar(img.id, e)}
                    className="absolute right-1 top-1 hidden rounded-md bg-destructive/90 p-1 text-white group-hover:flex"
                    aria-label="Eliminar imagen"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
