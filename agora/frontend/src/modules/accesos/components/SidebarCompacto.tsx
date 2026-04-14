import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Settings, FileSpreadsheet, MessagesSquare, KanbanSquare, LogOut, Wrench, ContactRound } from "lucide-react";
import { getTokenData } from "@/utils/getTokenData";
import { hasPermission } from "@/utils/permissions";

export default function SidebarCompacto() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getTokenData();
  const permissions = user?.permisos ?? [];
  const canViewBot = hasPermission("vista_bot", permissions);

  const menuItems = [
    { to: "/accesos/welcome", icon: Home, label: "Vistas" },
    hasPermission("gestionar_usuarios", permissions)
      ? { to: "/agenda", icon: ContactRound, label: "Agenda" }
      : null,
    hasPermission("gestionar_usuarios", permissions)
      ? { to: "/kanban", icon: KanbanSquare, label: "Chats" }
      : null,
    hasPermission("gestionar_usuarios", permissions)
      ? { to: "/meta-inbox", icon: MessagesSquare, label: "Meta" }
      : null,
    hasPermission("ver_reportes", permissions)
      ? { to: "/accesos/reportes", icon: FileSpreadsheet, label: "Reportes" }
      : null,
    hasPermission("editar_configuracion", permissions)
      ? { to: "/accesos/ajustes", icon: Settings, label: "Ajustes" }
      : null,
    canViewBot ? { to: "/wa-control", icon: Wrench, label: "Bot" } : null,
  ].filter(Boolean) as Array<{
    to: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
  }>;

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-white/5 bg-[#031015] shadow-[4px_0_24px_rgba(0,0,0,0.45)]"
    >
      <div className="p-6">
        <h1 className="text-2xl font-black tracking-tight text-[#6dfe9c]">AGORA</h1>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">
          Admin Access
        </p>
      </div>

      <nav className="mt-4 flex-1">
        {menuItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center px-6 py-4 text-xs font-bold uppercase tracking-[0.22em] transition-all duration-300 ${
                isActive || location.pathname.startsWith(`${to}/`)
                  ? "border-l-2 border-[#6dfe9c] bg-gradient-to-r from-[#6dfe9c]/10 to-transparent text-[#6dfe9c]"
                  : "text-slate-500 hover:bg-[#132930] hover:text-[#7ce6ff]"
              }`
            }
          >
            <Icon size={20} className="mr-3" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-6">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-[#132930] px-4 py-3 text-sm font-bold text-slate-300 transition-all hover:bg-[#1c3a44] hover:text-white"
        >
          <LogOut size={18} className="mr-2" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
