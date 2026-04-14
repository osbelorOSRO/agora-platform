import { Link } from "react-router-dom";
import { KeyRound, Users } from "lucide-react";

const cards = [
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
];

export default function Ajustes() {
  return (
    <section className="space-y-6 text-white">
      <div>
        <h1 className="text-3xl font-bold">Ajustes</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/80">
          Este módulo concentra la administración de accesos. Solo los perfiles con
          permiso <code>editar_configuracion</code> pueden operar estas vistas.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map(({ to, title, description, Icon }) => (
          <Link
            key={to}
            to={to}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10"
          >
            <Icon className="mb-4 h-8 w-8 text-white" />
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-white/75">{description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
