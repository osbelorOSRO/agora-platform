import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import style from "../styles/style";
import SidebarCompacto from "../components/SidebarCompacto";
import BottomNav from "../components/BottomNav";
import { ChevronLeft } from "lucide-react";
import { getTokenData } from "@/utils/getTokenData";
import { ProfilePhotoProvider, useProfilePhoto } from "@/context/ProfilePhotoContext";

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
  return (
    <ProfilePhotoProvider>
      <BaseLayoutInner />
    </ProfilePhotoProvider>
  );
}

function BaseLayoutInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getTokenData();
  const isMobile = useIsMobile();
  const { photoUrl } = useProfilePhoto();
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
      <header className="fixed left-14 md:left-64 right-0 top-0 z-30 flex h-16 items-center justify-end border-b border-border glass-md px-4 md:px-8">
        <div className="flex items-center space-x-5">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-foreground">
                {user?.nombre || user?.username || "Usuario"}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.rol ?? "sin rol"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/perfil")}
              title="Ver perfil"
              className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border border-border bg-secondary text-xs font-medium text-foreground hover:bg-card transition-colors overflow-hidden"
            >
              {photoUrl ? (
                <img src={photoUrl} alt="perfil" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                (user?.nombre?.[0] ?? user?.username?.[0] ?? "U").toUpperCase()
              )}
            </button>
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
