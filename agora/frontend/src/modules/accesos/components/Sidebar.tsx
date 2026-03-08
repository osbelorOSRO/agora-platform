// src/modules/accesos/components/Sidebar.tsx
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { to: "/accesos/welcome", label: "Welcome" },
    { to: "/accesos/usuarios", label: "Usuarios" },
    { to: "/accesos/roles", label: "Roles" },
    // Agrega otros items según módulo
  ];

  return (
    <aside className="w-60 bg-white shadow h-full p-4">
      <nav>
        {menuItems.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`block px-3 py-2 rounded hover:bg-gray-100 ${
              location.pathname === to ? "bg-gray-200 font-bold" : ""
            }`}
          >
            {label}
          </Link>
        ))}
        <Link
          to="/kanban"
          className="block px-3 py-2 mt-4 rounded hover:bg-gray-100 text-red-600"
        >
          Volver a Kanban
        </Link>
      </nav>
    </aside>
  );
}
