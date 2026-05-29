import { NavLink } from "react-router-dom";
import {
  Home,
  MessagesSquare,
  ContactRound,
  FileSpreadsheet,
  Settings,
  UserCircle,
} from "lucide-react";
import { getTokenData } from "@/utils/getTokenData";

export default function BottomNav() {
  const features = getTokenData()?.features;

  const navItems = [
    { to: "/accesos/welcome", icon: Home, label: "Home" },
    features?.conversations ? { to: "/meta-inbox",       icon: MessagesSquare,  label: "Threads"  } : null,
    features?.conversations ? { to: "/agenda",           icon: ContactRound,    label: "Contacts" } : null,
    features?.reports       ? { to: "/accesos/reportes", icon: FileSpreadsheet, label: "Reports"  } : null,
    features?.settings      ? { to: "/accesos/ajustes",  icon: Settings,        label: "Settings" } : null,
  ]
    .filter(Boolean)
    .slice(0, 4) as Array<{
    to: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
  }>;

  const items = [...navItems, { to: "/perfil", icon: UserCircle, label: "Profile" }];

  return (
    <nav className="shrink-0 flex h-14 items-stretch border-t border-border bg-background">
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${
              isActive
                ? "text-primary border-t-2 border-primary"
                : "text-muted-foreground"
            }`
          }
        >
          <Icon size={19} />
          <span className="text-[9px] font-bold uppercase tracking-[0.14em]">
            {label}
          </span>
        </NavLink>
      ))}
    </nav>
  );
}
