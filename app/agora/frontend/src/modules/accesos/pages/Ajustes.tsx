import { Link } from "react-router-dom";
import { KeyRound, Users, Activity, Wrench, LayoutList, PackageOpen, Plug, GitMerge, Zap, TrendingUp, Facebook, ListChecks } from "lucide-react";
import { getTokenData } from "@/utils/getTokenData";

const adminCards = [
  {
    to: "/accesos/ajustes/usuarios",
    title: "Usuarios",
    description: "Prerregistro, edición de datos base y asignación de rol.",
    Icon: Users,
  },
  {
    to: "/accesos/ajustes/roles",
    title: "Roles y permisos",
    description: "Configuración de permisos por rol según la nueva matriz de acceso.",
    Icon: KeyRound,
  },
  {
    to: "/accesos/ajustes/sesiones",
    title: "Sesiones activas",
    description: "Control en vivo de sesiones abiertas. Permite cerrar sesiones individualmente.",
    Icon: Activity,
  },
  {
    to: "/accesos/ajustes/ventas",
    title: "Registro de ventas",
    description: "Ingreso manual de ventas, catálogo de ofertas y matriz de precios por rango.",
    Icon: TrendingUp,
  },
  {
    to: "/accesos/ajustes/lead-catalog",
    title: "Listas de análisis",
    description: "Edita los motivos de pérdida, tipos de cliente, modalidades y tags de verbalización del formulario de ventas.",
    Icon: ListChecks,
  },
];

const scoringCards = [
  {
    to: "/accesos/ajustes/transicion",
    title: "Reglas de transición",
    description: "Umbrales de score que determinan el estado del actor (QUALIFIED, CHURNED, etc.).",
    Icon: GitMerge,
  },
  {
    to: "/accesos/ajustes/senales",
    title: "Señales de puntuación",
    description: "Deltas de score por tipo de señal detectada en conversaciones.",
    Icon: Zap,
  },
];

const toolCards = [
  {
    to: "/wa-control",
    title: "Bot",
    description: "Control del bot de WhatsApp y reglas de automatización.",
    Icon: Wrench,
    feature: "botView" as const,
  },
  {
    to: "/stage-templates",
    title: "Stages",
    description: "Plantillas de etapas del ciclo de vida de conversaciones.",
    Icon: LayoutList,
    feature: "superadmin" as const,
  },
  {
    to: "/offers",
    title: "Offers",
    description: "Gestión de ofertas y planes comerciales.",
    Icon: PackageOpen,
    feature: "superadmin" as const,
  },
  {
    to: "/integraciones",
    title: "Integrations",
    description: "Conexiones externas y configuración de canales.",
    Icon: Plug,
    feature: "superadmin" as const,
  },
  {
    to: "/integraciones/fca",
    title: "Facebook / Marketplace",
    description: "Integración de perfil personal de Facebook vía fca-unofficial.",
    Icon: Facebook,
    feature: "superadmin" as const,
  },
];

export default function Ajustes() {
  const features = getTokenData()?.features;

  const visibleTools = toolCards.filter(({ feature }) => features?.[feature]);

  return (
    <section className="space-y-8 text-white">
      <div>
        <h1 className="text-3xl font-bold">Ajustes</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Administración de accesos, herramientas operativas e integraciones.
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {adminCards.map(({ to, title, description, Icon }) => (
            <Link
              key={to}
              to={to}
              className="rounded-2xl border border-border bg-muted p-6 transition hover:bg-card"
            >
              <Icon className="mb-4 h-8 w-8 text-white" />
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </Link>
          ))}
        </div>

        <>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
            Scoring & Ciclo de vida
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {scoringCards.map(({ to, title, description, Icon }) => (
              <Link
                key={to}
                to={to}
                className="rounded-2xl border border-border bg-muted p-6 transition hover:bg-card"
              >
                <Icon className="mb-4 h-8 w-8 text-white" />
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{description}</p>
              </Link>
            ))}
          </div>
        </>

        {visibleTools.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
              Herramientas
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {visibleTools.map(({ to, title, description, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="rounded-2xl border border-border bg-muted p-6 transition hover:bg-card"
                >
                  <Icon className="mb-4 h-8 w-8 text-white" />
                  <h2 className="text-xl font-semibold">{title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
