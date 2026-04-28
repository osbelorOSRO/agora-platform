import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import EscaneoQR from "./pages/EscaneoQR";
import BaseLayout from "./modules/accesos/layouts/BaseLayout";
import Welcome from "./modules/accesos/pages/Welcome";
import Agenda from "./modules/accesos/pages/Agenda";
import Usuarios from "./modules/accesos/pages/Usuarios";
import Roles from "./modules/accesos/pages/Roles";
import MetaInboxPage from "./pages/MetaInboxPage";
import Ajustes from "./modules/accesos/pages/Ajustes";
import Reportes from "./modules/accesos/pages/Reportes";
import WaControlPage from "./modules/wa/pages/WaControlPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />
        <Route path="/escaneo-qr" element={<EscaneoQR />} />

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
            path="/accesos/usuarios"
            element={<Navigate to="/accesos/ajustes/usuarios" replace />}
          />
          <Route
            path="/accesos/roles"
            element={<Navigate to="/accesos/ajustes/roles" replace />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
