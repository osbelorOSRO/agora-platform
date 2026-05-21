import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Settings, FileSpreadsheet, MessagesSquare, LogOut, Wrench, ContactRound, Megaphone, LayoutList, PackageOpen, Plug } from "lucide-react";
import { getTokenData } from "@/utils/getTokenData";
import { hasPermission } from "@/utils/permissions";

export default function SidebarCompacto() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getTokenData();
  const permissions = user?.permisos ?? [];
  const canViewBot = hasPermission("vista_bot", permissions);
  const isSuperadmin = user?.rol === "superadmin";

  const menuItems = [
    { to: "/accesos/welcome", icon: Home, label: "Home" },
    hasPermission("gestionar_usuarios", permissions)
      ? { to: "/agenda", icon: ContactRound, label: "Contacts" }
      : null,
    hasPermission("gestionar_usuarios", permissions)
      ? { to: "/meta-inbox", icon: MessagesSquare, label: "Threads" }
      : null,
    hasPermission("gestionar_usuarios", permissions)
      ? { to: "/meta-ads", icon: Megaphone, label: "Ads WA" }
      : null,
    hasPermission("ver_reportes", permissions)
      ? { to: "/accesos/reportes", icon: FileSpreadsheet, label: "Reports" }
      : null,
    hasPermission("editar_configuracion", permissions)
      ? { to: "/accesos/ajustes", icon: Settings, label: "Settings" }
      : null,
    canViewBot ? { to: "/wa-control", icon: Wrench, label: "Bot" } : null,
    isSuperadmin ? { to: "/stage-templates", icon: LayoutList, label: "Stages" } : null,
    isSuperadmin ? { to: "/offers", icon: PackageOpen, label: "Offers" } : null,
    isSuperadmin ? { to: "/integraciones", icon: Plug, label: "Integrations" } : null,
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
    <aside className="flex h-[100svh] w-14 md:w-64 shrink-0 flex-col border-r border-border bg-background md:shadow-[4px_0_24px_rgba(0,0,0,0.45)]">
      {/* Desktop logo */}
      <div className="hidden md:block p-6">
        <h1 className="text-2xl font-black tracking-tight text-primary">AGORA</h1>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">
          by zaldio.net
        </p>
      </div>

      {/* Mobile logo — solo "A" */}
      <div className="flex md:hidden h-14 items-center justify-center border-b border-border">
        <span className="text-lg font-black text-primary">A</span>
      </div>

      <nav className="mt-0 md:mt-4 flex-1 overflow-y-auto">
        {menuItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              `flex items-center justify-center md:justify-start px-0 md:px-6 py-3 md:py-4 transition-all duration-200 ${
                isActive || location.pathname.startsWith(`${to}/`)
                  ? "border-l-2 border-primary bg-gradient-to-r from-primary/10 to-transparent text-primary"
                  : "text-muted-foreground hover:bg-card hover:text-foreground"
              }`
            }
          >
            <Icon size={20} className="shrink-0 md:mr-3" />
            <span className="hidden md:inline text-xs font-bold uppercase tracking-[0.22em]">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-2 md:p-6">
        <button
          type="button"
          onClick={handleLogout}
          title="Sign Out"
          className="flex w-full items-center justify-center rounded-xl border border-border bg-card px-2 md:px-4 py-3 text-sm font-bold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
        >
          <LogOut size={18} className="shrink-0 md:mr-2" />
          <span className="hidden md:inline">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
