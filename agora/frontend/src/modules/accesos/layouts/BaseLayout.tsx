import { Outlet } from "react-router-dom";
import style from "../styles/style";
import theme from "../styles/theme";
import SidebarCompacto from "../components/SidebarCompacto";

export default function BaseLayout() {
  return (
    <div
      className={style.glassBackground}
      style={{
        background: theme.colors.gradientBackground,
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        overflow: "hidden",
      }}
    >
      <SidebarCompacto />
      <main
        style={{
          flexGrow: 1,
          overflowY: "auto",
          padding: 24,
          minHeight: "100vh",
          marginLeft: 64, // este margen desplaza el contenido para que el sidebar no lo tape
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
