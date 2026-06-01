import { useRef, useState, useEffect } from "react";
import { useSidebar } from "@/context/SidebarContext";
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
  "/social-postings",
];

export default function SidebarCompacto() {
  const location = useLocation();
  const features = getTokenData()?.features;
  const sidebarRef = useRef<HTMLElement>(null);

  const isInSettings = SETTINGS_PATHS.some((p) => location.pathname.startsWith(p));
  const [settingsOpen, setSettingsOpen] = useState(isInSettings);
  const { expanded, setExpanded } = useSidebar();

  // Colapsar al hacer clic fuera del sidebar
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded]);

  // Colapsar al cambiar de ruta
  useEffect(() => {
    setExpanded(false);
  }, [location.pathname]);

  const mainItems = [
    { to: "/accesos/welcome", icon: Home,          label: "Home"     },
    features?.conversations ? { to: "/agenda",     icon: ContactRound,   label: "Contacts" } : null,
    features?.conversations ? { to: "/meta-inbox", icon: MessagesSquare, label: "Threads"  } : null,
  ].filter(Boolean) as Array<{ to: string; icon: React.ComponentType<{ size?: number; className?: string }>; label: string }>;

  const settingsSubItems = [
    features?.reports        && { to: "/accesos/reportes",            icon: FileSpreadsheet, label: "Reports"     },
    features?.conversations  && { to: "/meta-ads",                    icon: Megaphone,       label: "Ads WA"      },
    features?.socialPostings && { to: "/social-postings",             icon: CalendarDays,    label: "Posts"       },
    features?.settings       && { to: "/accesos/ajustes/usuarios",    icon: Users,           label: "Users"       },
    features?.settings       && { to: "/accesos/ajustes/roles",       icon: KeyRound,        label: "Roles"       },
    features?.settings       && { to: "/accesos/ajustes/sesiones",    icon: Activity,        label: "Sessions"    },
    features?.settings       && { to: "/accesos/ajustes/ventas",      icon: TrendingUp,      label: "Sales"       },
    features?.settings       && { to: "/accesos/ajustes/lead-catalog",icon: ListChecks,      label: "Lists"       },
    features?.settings       && { to: "/accesos/ajustes/transicion",  icon: GitMerge,        label: "Transition"  },
    features?.settings       && { to: "/accesos/ajustes/senales",     icon: Zap,             label: "Signals"     },
    features?.botView        && { to: "/wa-control",                  icon: Wrench,          label: "Bot"         },
    features?.superadmin     && { to: "/stage-templates",             icon: LayoutList,      label: "Stages"      },
    features?.superadmin     && { to: "/offers",                      icon: PackageOpen,     label: "Offers"      },
    features?.superadmin     && { to: "/integraciones",               icon: Plug,            label: "Integrations"},
    features?.superadmin     && { to: "/integraciones/fca",           icon: Facebook,        label: "Facebook"    },
  ].filter(Boolean) as Array<{ to: string; icon: React.ComponentType<{ size?: number; className?: string }>; label: string }>;

  return (
    <aside
      ref={sidebarRef}
      className={`fixed left-0 top-0 z-40 flex h-[100svh] flex-col border-r border-border bg-background shadow-[4px_0_24px_#000000] transition-[width] duration-200 ease-in-out overflow-hidden ${
        expanded ? "w-64" : "w-14"
      }`}
    >
      {/* Logo — clic aquí expande/colapsa */}
      <div
        className="flex h-14 shrink-0 cursor-pointer items-center border-b border-border px-4"
        onClick={() => setExpanded((v) => !v)}
      >
        <img src="/logo.svg" alt="Agora" width={36} height={36} className="shrink-0" />
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Items principales */}
        {mainItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              `flex h-14 items-center border-l-2 transition-colors ${
                isActive || location.pathname.startsWith(`${to}/`)
                  ? "border-primary bg-accent text-primary"
                  : "border-transparent text-muted-foreground hover:bg-card hover:text-foreground"
              }`
            }
          >
            <span className="flex w-14 shrink-0 items-center justify-center">
              <Icon size={20} />
            </span>
            {expanded && <span className="text-sm font-medium whitespace-nowrap pr-4">{label}</span>}
          </NavLink>
        ))}

        {/* Settings */}
        <button
          type="button"
          title="Settings"
          onClick={() => {
            if (!expanded) {
              setExpanded(true);
              setSettingsOpen(true);
            } else {
              setSettingsOpen((v) => !v);
            }
          }}
          className={`flex h-14 w-full items-center border-l-2 transition-colors ${
            isInSettings
              ? "border-primary bg-accent text-primary"
              : "border-transparent text-muted-foreground hover:bg-card hover:text-foreground"
          }`}
        >
          <span className="flex w-14 shrink-0 items-center justify-center">
            <Settings size={20} />
          </span>
          {expanded && (
            <>
              <span className="flex-1 text-left text-sm font-medium">Settings</span>
              <ChevronDown
                size={14}
                className={`mr-4 shrink-0 transition-transform duration-200 ${settingsOpen ? "rotate-180" : ""}`}
              />
            </>
          )}
        </button>

        {/* Submenú Settings */}
        {expanded && settingsOpen && (
          <div className="border-l border-border ml-6">
            {settingsSubItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                    isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                <Icon size={15} className="shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        )}

        {/* Profile */}
        <NavLink
          to="/perfil"
          title="Profile"
          className={({ isActive }) =>
            `flex h-14 items-center border-l-2 transition-colors ${
              isActive ? "border-primary bg-accent text-primary" : "border-transparent text-muted-foreground hover:bg-card hover:text-foreground"
            }`
          }
        >
          <span className="flex w-14 shrink-0 items-center justify-center">
            <UserCircle size={20} />
          </span>
          {expanded && <span className="text-sm font-medium whitespace-nowrap pr-4">Profile</span>}
        </NavLink>
      </nav>
    </aside>
  );
}
