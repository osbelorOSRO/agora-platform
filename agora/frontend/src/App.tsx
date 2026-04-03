import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { KanbanProvider } from "./context/KanbanContext";
import { KanbanUIProvider } from "./context/KanbanUIContext";
import Login from "./pages/Login";
import KanbanBoard from "./pages/KanbanBoard";
import ProtectedRoute from "./components/ProtectedRoute";
import EscaneoQR from "./pages/EscaneoQR";
import BaseLayout from "./modules/accesos/layouts/BaseLayout";
import Welcome from "./modules/accesos/pages/Welcome";
import Usuarios from "./modules/accesos/pages/Usuarios";
import Roles from "./modules/accesos/pages/Roles";
import Oficinas from "./modules/accesos/pages/Oficinas";
import KPIs from "./modules/accesos/pages/KPIs";
import MetaInboxPage from "./pages/MetaInboxPage";

function App() {
  return (
    <KanbanProvider>
      <KanbanUIProvider>
        <BrowserRouter>
          <Routes>
        {/* Redirección raíz */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Rutas públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/escaneo-qr" element={<EscaneoQR />} />

        {/* Rutas protegidas */}
        <Route
          path="/kanban"
          element={
            <ProtectedRoute>
              <KanbanBoard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/meta-inbox"
          element={
            <ProtectedRoute>
              <MetaInboxPage />
            </ProtectedRoute>
          }
        />

        {/* Módulo accesos protegido */}
        <Route
          path="/accesos"
          element={
            <ProtectedRoute>
              <BaseLayout />
            </ProtectedRoute>
          }
        >
          {/* Rutas hijas accesos */}
          <Route path="welcome" element={<Welcome />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route patRoute path="oficinas" element={<Oficinas />} />
          <Route path="kpis" element={<KPIs />} />
          <Route patRoute path="roles" element={<Roles />} />
        </Route>
      </Routes>
        </BrowserRouter>
      </KanbanUIProvider>
    </KanbanProvider>
  );
}

export default App;
