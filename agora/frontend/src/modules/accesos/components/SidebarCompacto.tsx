// src/components/SidebarCompacto.tsx
import { Link, useLocation } from "react-router-dom";
import { Home, Users, Key, Building, BarChart2, ArrowLeft } from "lucide-react";

export default function SidebarCompacto() {
  const location = useLocation();

  const menuItems = [
    { to: "/accesos/welcome", icon: Home },
    { to: "/accesos/usuarios", icon: Users },
    { to: "/accesos/roles", icon: Key },
    { to: "/accesos/oficinas", icon: Building },
    { to: "/accesos/kpis", icon: BarChart2 },
  ];

  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 64,
        height: "100vh",
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        backdropFilter: "blur(10px)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 16,
      }}
    >
      <nav style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {menuItems.map(({ to, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            style={{
              color: location.pathname === to ? "white" : "black",
              padding: 8,
              borderRadius: 8,
              backgroundColor:
                location.pathname === to ? "rgba(255,255,255,0.3)" : "transparent",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Icon size={24} />
          </Link>
        ))}
        <Link
          to="/kanban"
          style={{
            marginTop: 32,
            color: "red",
            padding: 8,
            borderRadius: 8,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={24} />
        </Link>
      </nav>
    </aside>
  );
}
