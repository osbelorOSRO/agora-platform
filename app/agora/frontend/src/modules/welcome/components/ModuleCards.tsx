import React from "react";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ModuleCard } from "../types";

interface Props {
  cards: ModuleCard[];
}

export const ModuleCards: React.FC<Props> = ({ cards }) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-5">
      {cards.map(({ title, value, subtitle, to, actionLabel, onAction, enabled, Icon }) => (
        <article
          key={title}
          className={`rounded-xl border p-3 md:p-5 min-w-0 overflow-hidden [content-visibility:auto] [contain-intrinsic-size:0_160px] ${
            enabled ? "border-border bg-card shadow-xl" : "border-muted bg-background"
          }`}
        >
          <div className="rounded-xl bg-input p-2 md:p-3 w-fit">
            <Icon className="h-4 w-4 md:h-6 md:w-6 text-foreground" />
          </div>
          <h2 className="mt-2 md:mt-4 text-sm md:text-xl font-bold text-foreground truncate">{title}</h2>
          <p className="mt-1 md:mt-3 text-sm md:text-2xl font-black leading-tight text-foreground break-words">{value}</p>
          <p className="mt-1 md:mt-2 hidden md:block text-sm text-muted-foreground">{subtitle}</p>

          {to && enabled && (
            <button
              type="button"
              onClick={() => navigate(to)}
              className="mt-3 md:mt-4 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-border bg-input px-2 md:px-4 py-2 text-xs md:text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Ir al módulo
            </button>
          )}
          {!to && enabled && onAction && actionLabel && (
            <button
              type="button"
              onClick={onAction}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-input px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              {actionLabel}
            </button>
          )}
          {!enabled && (
            <div className="mt-3 md:mt-4 flex items-center gap-1 rounded-xl border border-border bg-input px-2 md:px-4 py-2 text-xs md:text-sm text-muted-foreground">
              <Lock className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
              <span className="truncate">Sin permiso</span>
            </div>
          )}
        </article>
      ))}
    </div>
  );
};
