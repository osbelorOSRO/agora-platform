import React, { useState } from "react";
import { Image, X } from "lucide-react";
import { GaleriaImagenes } from "./GaleriaImagenes";
import type { CreatePosteoDto, ImagenGaleria, Posteo, UpdatePosteoDto } from "../types";

interface Props {
  fecha: string;          // "YYYY-MM-DD"
  posteo?: Posteo | null; // si viene → modo edición
  guardando: boolean;
  onGuardar: (dto: CreatePosteoDto | UpdatePosteoDto) => void;
  onClose: () => void;
}

export const TareaForm: React.FC<Props> = ({
  fecha,
  posteo,
  guardando,
  onGuardar,
  onClose,
}) => {
  const [caption, setCaption] = useState(posteo?.caption ?? "");
  const [imagenSeleccionada, setImagenSeleccionada] = useState<ImagenGaleria | null>(
    posteo?.url_imagen ? { id: posteo.imagen_id ?? 0, url: posteo.url_imagen, nombre: "", mime_type: null, size_bytes: null, created_at: "" } : null,
  );
  const [galeriaAbierta, setGaleriaAbierta] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (posteo) {
      const dto: UpdatePosteoDto = {};
      if (caption !== posteo.caption) dto.caption = caption;
      if (imagenSeleccionada?.id !== posteo.imagen_id) {
        dto.imagen_id = imagenSeleccionada?.id ?? undefined;
        dto.url_imagen = imagenSeleccionada?.url ?? undefined;
      }
      onGuardar(dto);
    } else {
      const dto: CreatePosteoDto = {
        fecha,
        caption: caption || undefined,
        url_imagen: imagenSeleccionada?.url,
        imagen_id: imagenSeleccionada?.id,
      };
      onGuardar(dto);
    }
  };

  const fechaDisplay = new Date(fecha + "T12:00:00").toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-primary">
                {posteo ? "Editar posteo" : "Nuevo posteo"}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground capitalize">{fechaDisplay}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-white transition"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
            {/* Imagen */}
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Imagen
              </label>
              {imagenSeleccionada ? (
                <div className="relative inline-block">
                  <img
                    src={imagenSeleccionada.url}
                    alt="imagen seleccionada"
                    className="h-32 w-32 rounded-xl border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImagenSeleccionada(null)}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white"
                    aria-label="Quitar imagen"
                  >
                    <X size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setGaleriaAbierta(true)}
                    className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition"
                  >
                    <Image size={12} />
                    Cambiar imagen
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setGaleriaAbierta(true)}
                  className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-muted px-4 py-3 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-white"
                >
                  <Image size={16} />
                  Seleccionar de la galería
                </button>
              )}
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Caption
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
                maxLength={2200}
                placeholder="Escribe el texto del posteo…"
                className="w-full resize-none rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
              <p className="text-right text-xs text-muted-foreground">
                {caption.length}/2200
              </p>
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground transition hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando || (!caption.trim() && !imagenSeleccionada)}
                className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {guardando ? "Guardando…" : posteo ? "Guardar cambios" : "Crear posteo"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {galeriaAbierta && (
        <GaleriaImagenes
          seleccionadaId={imagenSeleccionada?.id}
          onSeleccionar={(img) => {
            setImagenSeleccionada(img);
            setGaleriaAbierta(false);
          }}
          onClose={() => setGaleriaAbierta(false)}
        />
      )}
    </>
  );
};
