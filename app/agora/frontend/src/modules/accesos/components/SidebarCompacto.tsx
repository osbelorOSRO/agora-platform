import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home, Settings, FileSpreadsheet, MessagesSquare, UserCircle,
  ContactRound, Megaphone, CalendarDays, ChevronDown,
  Users, KeyRound, Activity, TrendingUp, ListChecks,
  Wrench, LayoutList, PackageOpen, Plug, GitMerge, Zap, Facebook,
} from "lucide-react";
import { getTokenData } from "@/utils/getTokenData";

const SETTINGS_PATHS = [
  "/accesos/ajustes", "/accesos/reportes", "/meta-ads",
  "/wa-control", "/stage-templates", "/offers", "/integraciones",
];

export default function SidebarCompacto() {
  const location = useLocation();
  const features = getTokenData()?.features;

  const isInSettings = SETTINGS_PATHS.some((p) => location.pathname.startsWith(p));
  const [settingsOpen, setSettingsOpen] = useState(isInSettings);

  const mainItems = [
    { to: "/accesos/welcome", icon: Home,          label: "Home"     },
    features?.conversations ? { to: "/agenda",     icon: ContactRound,   label: "Contacts" } : null,
    features?.conversations ? { to: "/meta-inbox", icon: MessagesSquare, label: "Threads"  } : null,
  ].filter(Boolean) as Array<{ to: string; icon: React.ComponentType<{ size?: number; className?: string }>; label: string }>;

  const settingsSubItems = [
    features?.reports        && { to: "/accesos/reportes",           icon: FileSpreadsheet, label: "Reports"     },
    features?.conversations  && { to: "/meta-ads",                  icon: Megaphone,       label: "Ads WA"      },
    features?.socialPostings && { to: "/social-postings",           icon: CalendarDays,    label: "Posts"       },
    features?.settings      && { to: "/accesos/ajustes/usuarios",   icon: Users,           label: "Users"       },
    features?.settings      && { to: "/accesos/ajustes/roles",      icon: KeyRound,        label: "Roles"       },
    features?.settings      && { to: "/accesos/ajustes/sesiones",   icon: Activity,        label: "Sessions"    },
    features?.settings      && { to: "/accesos/ajustes/ventas",     icon: TrendingUp,      label: "Sales"       },
    features?.settings      && { to: "/accesos/ajustes/lead-catalog",icon: ListChecks,     label: "Lists"       },
    features?.settings      && { to: "/accesos/ajustes/transicion", icon: GitMerge,        label: "Transition"  },
    features?.settings      && { to: "/accesos/ajustes/senales",    icon: Zap,             label: "Signals"     },
    features?.botView       && { to: "/wa-control",                 icon: Wrench,          label: "Bot"         },
    features?.superadmin    && { to: "/stage-templates",            icon: LayoutList,      label: "Stages"      },
    features?.superadmin    && { to: "/offers",                     icon: PackageOpen,     label: "Offers"      },
    features?.superadmin    && { to: "/integraciones",              icon: Plug,            label: "Integrations"},
    features?.superadmin    && { to: "/integraciones/fca",          icon: Facebook,        label: "Facebook"    },
  ].filter(Boolean) as Array<{ to: string; icon: React.ComponentType<{ size?: number; className?: string }>; label: string }>;

  const navLink = (to: string, icon: React.ComponentType<{ size?: number; className?: string }>, label: string) => (
    <NavLink
      key={to}
      to={to}
      title={label}
      className={({ isActive }) =>
        `flex items-center justify-center md:justify-start px-0 md:px-6 py-3 md:py-4 transition-all duration-200 ${
          isActive || location.pathname.startsWith(`${to}/`)
            ? "border-l-2 border-primary bg-accent text-primary"
            : "text-muted-foreground hover:bg-card hover:text-foreground"
        }`
      }
    >
      {(() => { const Icon = icon; return <Icon size={20} className="shrink-0 md:mr-3" />; })()}
      <span className="hidden md:inline text-sm font-medium">{label}</span>
    </NavLink>
  );

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-[100svh] w-14 md:w-64 flex-col border-r border-border bg-background md:shadow-[4px_0_24px_#000000]">
      {/* Desktop logo */}
      <div className="hidden md:block p-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Agora</h1>
        <p className="mt-1 text-[10px] text-muted-foreground">by zaldio.net</p>
      </div>

      {/* Mobile logo */}
      <div className="flex md:hidden h-14 items-center justify-center border-b border-border">
        <span className="text-lg font-bold text-foreground">A</span>
      </div>

      <nav className="mt-0 md:mt-4 flex-1 overflow-y-auto">
        {mainItems.map(({ to, icon, label }) => navLink(to, icon, label))}

        {/* Settings toggle — desktop expande submenú, mobile va a la página */}
        <NavLink
          to="/accesos/ajustes"
          title="Settings"
          onClick={(e) => {
            if (window.innerWidth >= 768) {
              e.preventDefault();
              setSettingsOpen((v) => !v);
            }
          }}
          className={() =>
            `flex items-center justify-center md:justify-start px-0 md:px-6 py-3 md:py-4 transition-all duration-200 ${
              isInSettings
                ? "border-l-2 border-primary bg-accent text-primary"
                : "text-muted-foreground hover:bg-card hover:text-foreground"
            }`
          }
        >
          <Settings size={20} className="shrink-0 md:mr-3" />
          <span className="hidden md:inline text-sm font-medium flex-1">Settings</span>
          <ChevronDown
            size={14}
            className={`hidden md:inline shrink-0 mr-1 transition-transform duration-200 ${settingsOpen ? "rotate-180" : ""}`}
          />
        </NavLink>

        {/* Submenú Settings — solo desktop */}
        {settingsOpen && (
          <div className="hidden md:block border-l border-border ml-6">
            {settingsSubItems.map(({ to, icon, label }) => (
              <NavLink
                key={to}
                to={to}
                title={label}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {(() => { const Icon = icon; return <Icon size={15} className="shrink-0" />; })()}
                {label}
              </NavLink>
            ))}
          </div>
        )}

        {navLink("/perfil", UserCircle, "Profile")}
      </nav>
    </aside>
  );
}
