import React from "react";
import { RefreshCw } from "lucide-react";
import Lottie from "lottie-react";
import loadingAnimation from "@/assets/animations/loading.json";

// Detecta errores de chunk de Vite/Rollup en cualquier navegador
export function isChunkLoadError(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    /failed to fetch dynamically imported module/i.test(error.message) ||
    /loading chunk \d+ failed/i.test(error.message) ||
    /error loading dynamically imported module/i.test(error.message)
  );
}

interface Props {
  onReload?: () => void;
}

export const ChunkErrorPage: React.FC<Props> = ({ onReload }) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
    <div className="w-32">
      <Lottie animationData={loadingAnimation} loop={true} style={{ width: "100%" }} />
    </div>

    <div className="space-y-2">
      <h2 className="text-xl font-bold text-foreground">Nueva versión disponible</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Se publicó una actualización de la aplicación. Recargá la página para obtener la última versión.
      </p>
    </div>

    <button
      onClick={onReload ?? (() => window.location.reload())}
      className="inline-flex items-center gap-2 rounded-xl border border-border-primary bg-accent px-6 py-2.5 text-sm font-bold text-primary transition hover:bg-accent"
    >
      <RefreshCw size={15} />
      Recargar ahora
    </button>

    <p className="text-xs text-muted-foreground">
      Si el problema persiste, limpiá el caché del navegador (Ctrl + Shift + R).
    </p>
  </div>
);
