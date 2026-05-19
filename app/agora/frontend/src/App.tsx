import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import EscaneoQR from "./pages/EscaneoQR";
import ResetPassword from "./pages/ResetPassword";
import Setup2FA from "./pages/Setup2FA";
import BaseLayout from "./modules/accesos/layouts/BaseLayout";
import Welcome from "./modules/accesos/pages/Welcome";
import Agenda from "./modules/accesos/pages/Agenda";
import Usuarios from "./modules/accesos/pages/Usuarios";
import Roles from "./modules/accesos/pages/Roles";
import MetaInboxPage from "./pages/MetaInboxPage";
import WhatsappAdsPage from "./pages/WhatsappAdsPage";
import Ajustes from "./modules/accesos/pages/Ajustes";
import Sesiones from "./modules/accesos/pages/Sesiones";
import Reportes from "./modules/accesos/pages/Reportes";
import WaControlPage from "./modules/wa/pages/WaControlPage";
import StageTemplatesPage from "./pages/StageTemplatesPage";
import OffersPage from "./pages/OffersPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />
        <Route path="/escaneo-qr" element={<EscaneoQR />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/setup-2fa" element={<Setup2FA />} />

        <Route
          element={
            <ProtectedRoute>
              <BaseLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/accesos" element={<Navigate to="/accesos/welcome" replace />} />
          <Route path="/accesos/welcome" element={<Welcome />} />
          <Route
            path="/agenda"
            element={
              <ProtectedRoute requiredPermissions={["gestionar_usuarios"]}>
                <Agenda />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meta-inbox"
            element={
              <ProtectedRoute requiredPermissions={["gestionar_usuarios"]}>
                <MetaInboxPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meta-ads"
            element={
              <ProtectedRoute requiredPermissions={["gestionar_usuarios"]}>
                <WhatsappAdsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accesos/reportes"
            element={
              <ProtectedRoute requiredPermissions={["ver_reportes"]}>
                <Reportes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wa-control"
            element={
              <ProtectedRoute requiredPermissions={["vista_bot"]}>
                <WaControlPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accesos/ajustes"
            element={
              <ProtectedRoute requiredPermissions={["editar_configuracion"]}>
                <Ajustes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accesos/ajustes/usuarios"
            element={
              <ProtectedRoute requiredPermissions={["editar_configuracion"]}>
                <Usuarios />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accesos/ajustes/roles"
            element={
              <ProtectedRoute requiredPermissions={["editar_configuracion"]}>
                <Roles />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accesos/ajustes/sesiones"
            element={
              <ProtectedRoute requiredPermissions={["editar_configuracion"]}>
                <Sesiones />
              </ProtectedRoute>
            }
          />
          <Route
            path="/accesos/usuarios"
            element={<Navigate to="/accesos/ajustes/usuarios" replace />}
          />
          <Route
            path="/accesos/roles"
            element={<Navigate to="/accesos/ajustes/roles" replace />}
          />
          <Route
            path="/stage-templates"
            element={
              <ProtectedRoute requiredRole="superadmin">
                <StageTemplatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/offers"
            element={
              <ProtectedRoute requiredRole="superadmin">
                <OffersPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
