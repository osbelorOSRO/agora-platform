import React from "react";
import Lottie from "lottie-react";
import errorGlobalAnimation from "@/assets/animations/error-global.json";
import errorSectionAnimation from "@/assets/animations/error-section.json";

interface Props {
  variant?: "global" | "section";
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const ErrorPage: React.FC<Props> = ({
  variant = "global",
  title,
  message,
  actionLabel,
  onAction,
}) => {
  const isGlobal = variant === "global";

  const defaultTitle = isGlobal ? "Algo salió mal" : "Error en esta sección";
  const defaultMessage = isGlobal
    ? "La aplicación encontró un error inesperado."
    : "Esta sección no pudo cargarse correctamente.";
  const defaultActionLabel = isGlobal ? "Recargar página" : "Reintentar";
  const defaultAction = isGlobal ? () => window.location.reload() : undefined;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-6 text-center ${
        isGlobal
          ? "min-h-screen bg-background px-6"
          : "min-h-[280px] px-6 py-8"
      }`}
    >
      <div className={isGlobal ? "w-full max-w-sm" : "w-full max-w-[200px]"}>
        <Lottie
          animationData={isGlobal ? errorGlobalAnimation : errorSectionAnimation}
          loop={false}
          style={{ width: "100%", height: "auto" }}
        />
      </div>

      <div className="space-y-2">
        <h2
          className={`font-bold text-foreground ${
            isGlobal ? "text-2xl" : "text-base"
          }`}
        >
          {title ?? defaultTitle}
        </h2>
        <p
          className={`text-muted-foreground ${
            isGlobal ? "max-w-md text-sm" : "max-w-xs text-xs"
          }`}
        >
          {message ?? defaultMessage}
        </p>
      </div>

      <button
        onClick={onAction ?? defaultAction}
        className={`rounded-xl border border-border bg-input font-bold text-foreground transition hover:border-border-primary hover:text-primary ${
          isGlobal ? "px-6 py-2.5 text-sm" : "px-4 py-2 text-xs"
        }`}
      >
        {actionLabel ?? defaultActionLabel}
      </button>
    </div>
  );
};
