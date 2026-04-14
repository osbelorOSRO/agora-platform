import { Outlet, useLocation } from "react-router-dom";
import style from "../styles/style";
import SidebarCompacto from "../components/SidebarCompacto";
import { Bell, LayoutGrid } from "lucide-react";
import { getTokenData } from "@/utils/getTokenData";

export default function BaseLayout() {
  const location = useLocation();
  const user = getTokenData();
  const isImmersiveSection =
    location.pathname.startsWith("/kanban") || location.pathname.startsWith("/meta-inbox");

  const currentSection = (() => {
    if (location.pathname.startsWith("/agenda")) return "Agenda";
    if (location.pathname.startsWith("/kanban")) return "Chats";
    if (location.pathname.startsWith("/meta-inbox")) return "Meta";
    if (location.pathname.startsWith("/wa-control")) return "Bot";
    if (location.pathname.startsWith("/accesos/reportes")) return "Reportes";
    if (location.pathname.startsWith("/accesos/ajustes")) return "Ajustes";
    return "Vistas";
  })();

  return (
    <div
      className={style.glassBackground}
      style={{
        backgroundColor: "#031015",
        backgroundImage: `
          radial-gradient(circle at top right, rgba(109, 254, 156, 0.08), transparent 30%),
          radial-gradient(circle at bottom left, rgba(124, 230, 255, 0.08), transparent 28%),
          linear-gradient(180deg, rgba(19, 41, 48, 0.55) 0%, rgba(3, 16, 21, 0.96) 24%, rgba(3, 16, 21, 1) 100%)
        `,
        minHeight: "100vh",
        width: "100%",
        maxWidth: "100%",
        display: "flex",
        overflow: "hidden",
      }}
    >
      <SidebarCompacto />
      <header className="fixed left-64 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-white/5 bg-[#031015]/80 px-8 backdrop-blur-xl">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-black uppercase tracking-[0.2em] text-[#6dfe9c]">
            AGORA
          </h2>
          <div className="h-4 w-px bg-white/15" />
          <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-white">
            {currentSection}
          </h3>
        </div>

        <div className="flex items-center space-x-5">
          <button
            type="button"
            className="relative text-white transition-colors hover:text-[#7ce6ff]"
          >
            <Bell size={18} />
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#6dfe9c]" />
          </button>

          <button
            type="button"
            className="text-white transition-colors hover:text-[#7ce6ff]"
          >
            <LayoutGrid size={18} />
          </button>

          <div className="flex items-center gap-3 border-l border-white/10 pl-4">
            <div className="text-right">
              <p className="text-xs font-bold uppercase text-white">
                {user?.nombre || user?.username || "Usuario"}
              </p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#6dfe9c]/70">
                {user?.rol ?? "sin rol"}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#6dfe9c]/30 bg-white/5 text-xs font-bold text-white">
              {(user?.nombre?.[0] ?? user?.username?.[0] ?? "U").toUpperCase()}
            </div>
          </div>
        </div>
      </header>
      <main
        style={{
          flexGrow: 1,
          overflowY: isImmersiveSection ? "hidden" : "auto",
          overflowX: "hidden",
          padding: 24,
          minHeight: "100vh",
          marginLeft: 256,
          paddingTop: 88,
          background:
            "linear-gradient(180deg, rgba(3, 16, 21, 0.12) 0%, rgba(3, 16, 21, 0) 18%, rgba(3, 16, 21, 0.14) 100%)",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
