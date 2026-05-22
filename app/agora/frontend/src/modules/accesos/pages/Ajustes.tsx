import { Link } from "react-router-dom";
import { KeyRound, Users, Activity, Wrench, LayoutList, PackageOpen, Plug } from "lucide-react";
import { getTokenData } from "@/utils/getTokenData";
import { hasPermission } from "@/utils/permissions";

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
];

const toolCards = [
  {
    to: "/wa-control",
    title: "Bot",
    description: "Control del bot de WhatsApp y reglas de automatización.",
    Icon: Wrench,
    permission: "vista_bot" as const,
    superadmin: false,
  },
  {
    to: "/stage-templates",
    title: "Stages",
    description: "Plantillas de etapas del ciclo de vida de conversaciones.",
    Icon: LayoutList,
    permission: null,
    superadmin: true,
  },
  {
    to: "/offers",
    title: "Offers",
    description: "Gestión de ofertas y planes comerciales.",
    Icon: PackageOpen,
    permission: null,
    superadmin: true,
  },
  {
    to: "/integraciones",
    title: "Integrations",
    description: "Conexiones externas y configuración de canales.",
    Icon: Plug,
    permission: null,
    superadmin: true,
  },
];

export default function Ajustes() {
  const user = getTokenData();
  const permissions = user?.permisos ?? [];
  const isSuperadmin = user?.rol === "superadmin";

  const visibleTools = toolCards.filter(({ permission, superadmin }) => {
    if (superadmin) return isSuperadmin;
    if (permission) return hasPermission(permission, permissions);
    return false;
  });

  return (
    <section className="space-y-8 text-white">
      <div>
        <h1 className="text-3xl font-bold">Ajustes</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#CCCCCC]">
          Administración de accesos, herramientas operativas e integraciones.
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {adminCards.map(({ to, title, description, Icon }) => (
            <Link
              key={to}
              to={to}
              className="rounded-2xl border border-[#2D2D2D] bg-[#141414] p-6 transition hover:bg-[#1A1A1A]"
            >
              <Icon className="mb-4 h-8 w-8 text-white" />
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-[#BFBFBF]">{description}</p>
            </Link>
          ))}
        </div>

        {visibleTools.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#666666]">
              Herramientas
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {visibleTools.map(({ to, title, description, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="rounded-2xl border border-[#2D2D2D] bg-[#141414] p-6 transition hover:bg-[#1A1A1A]"
                >
                  <Icon className="mb-4 h-8 w-8 text-white" />
                  <h2 className="text-xl font-semibold">{title}</h2>
                  <p className="mt-2 text-sm text-[#BFBFBF]">{description}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
