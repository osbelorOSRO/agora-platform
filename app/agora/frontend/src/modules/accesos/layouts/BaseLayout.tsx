import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import style from "../styles/style";
import SidebarCompacto from "../components/SidebarCompacto";
import BottomNav from "../components/BottomNav";
import { Bell, ChevronLeft, LayoutGrid } from "lucide-react";
import { getTokenData } from "@/utils/getTokenData";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

export default function BaseLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getTokenData();
  const isMobile = useIsMobile();
  const isImmersiveSection = location.pathname.startsWith("/meta-inbox");

  const currentSection = (() => {
    if (location.pathname.startsWith("/agenda")) return "Contacts";
    if (location.pathname.startsWith("/meta-inbox")) return "Threads";
    if (location.pathname.startsWith("/meta-ads")) return "Ads WA";
    if (location.pathname.startsWith("/wa-control")) return "Bot";
    if (location.pathname.startsWith("/accesos/reportes")) return "Reports";
    if (location.pathname.startsWith("/accesos/ajustes")) return "Settings";
    if (location.pathname.startsWith("/stage-templates")) return "Stages";
    if (location.pathname.startsWith("/offers")) return "Offers";
    if (location.pathname.startsWith("/integraciones")) return "Integrations";
    return "Home";
  })();

  // ── Layout móvil — cero position:fixed, máximo 1 capa compositor GPU ──
  if (isMobile) {
    return (
      <div className="flex flex-col h-[100svh] overflow-hidden bg-background">
        {isImmersiveSection && (
          <div className="shrink-0 flex items-center h-12 px-4 border-b border-border bg-background">
            <button
              type="button"
              onClick={() => navigate("/accesos/welcome")}
              className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={18} />
              Volver
            </button>
          </div>
        )}
        <main
          className={`flex-1 min-h-0 bg-background ${
            isImmersiveSection
              ? "overflow-hidden flex flex-col"
              : "overflow-y-auto overscroll-y-contain px-4 pt-4 pb-4"
          }`}
        >
          <Outlet />
        </main>
        {!isImmersiveSection && <BottomNav />}
      </div>
    );
  }

  // ── Layout desktop — sin cambios ──
  return (
    <div className="bg-background flex min-h-[100svh] w-full max-w-full">
      <SidebarCompacto />
      <header className="fixed left-14 md:left-64 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-border glass-md px-4 md:px-8">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-black uppercase tracking-[0.2em] text-primary">
            AGORA
          </h2>
          <div className="h-4 w-px bg-border" />
          <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-foreground">
            {currentSection}
          </h3>
        </div>

        <div className="flex items-center space-x-5">
          <button
            type="button"
            className="relative text-foreground transition-colors hover:text-primary"
          >
            <Bell size={18} />
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" />
          </button>

          <button
            type="button"
            className="hidden md:block text-foreground transition-colors hover:text-primary"
          >
            <LayoutGrid size={18} />
          </button>

          <div className="flex items-center gap-2 md:gap-3 border-l border-border pl-3 md:pl-4">
            <div className="hidden md:block text-right">
              <p className="text-xs font-bold uppercase text-foreground">
                {user?.nombre || user?.username || "Usuario"}
              </p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-primary/70">
                {user?.rol ?? "sin rol"}
              </p>
            </div>
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border border-[#6E3709] glass-sm text-xs font-bold text-foreground">
              {(user?.nombre?.[0] ?? user?.username?.[0] ?? "U").toUpperCase()}
            </div>
          </div>
        </div>
      </header>
      <main
        className={`flex-1 ml-14 md:ml-64 bg-background ${
          isImmersiveSection
            ? "pt-16 h-[100svh] flex flex-col overflow-hidden"
            : "pt-[88px] px-4 pb-4 md:px-6 md:pb-6"
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
