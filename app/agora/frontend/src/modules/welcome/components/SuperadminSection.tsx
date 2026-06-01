import React from "react";
import { Link } from "react-router-dom";
import { LayoutList, PackageOpen, Plug } from "lucide-react";

const SUPERADMIN_CARDS = [
  { title: "Stage Templates", subtitle: "Configuración de flujos y etapas de conversación del bot.", to: "/stage-templates", Icon: LayoutList },
  { title: "Offers", subtitle: "Catálogo de ofertas y planes disponibles en el motor.", to: "/offers", Icon: PackageOpen },
  { title: "Integrations", subtitle: "Tokens, webhooks y accesos de la app Meta / Facebook.", to: "/integraciones", Icon: Plug },
] as const;

export const SuperadminSection: React.FC = () => (
  <div className="space-y-3">
    <p className="text-sm font-medium text-muted-foreground">Superadmin</p>
    <div className="grid gap-4 md:grid-cols-3">
      {SUPERADMIN_CARDS.map(({ title, subtitle, to, Icon }) => (
        <article key={title} className="rounded-xl border border-border bg-card p-5 transition hover:border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="rounded-xl bg-secondary p-3">
              <Icon className="h-6 w-6 text-muted-foreground" />
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-muted-foreground">
              Superadmin
            </span>
          </div>
          <h2 className="mt-4 text-xl font-bold text-foreground">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <Link to={to} className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition hover:bg-input">
            Ir al módulo
          </Link>
        </article>
      ))}
    </div>
  </div>
);
