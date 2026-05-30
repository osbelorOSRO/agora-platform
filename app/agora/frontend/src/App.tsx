import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Carga síncrona — rutas públicas y layout base (siempre necesarios)
import Login from "./pages/Login";
import EscaneoQR from "./pages/EscaneoQR";
import ResetPassword from "./pages/ResetPassword";
import Setup2FA from "./pages/Setup2FA";
import BaseLayout from "./modules/accesos/layouts/BaseLayout";

// Lazy — páginas protegidas (se cargan solo al navegar a la ruta)
const Welcome            = lazy(() => import("./modules/accesos/pages/Welcome"));
const Agenda             = lazy(() => import("./modules/accesos/pages/Agenda"));
const Usuarios           = lazy(() => import("./modules/accesos/pages/Usuarios"));
const Roles              = lazy(() => import("./modules/accesos/pages/Roles"));
const MetaInboxPage      = lazy(() => import("./pages/MetaInboxPage"));
const WhatsappAdsPage    = lazy(() => import("./pages/WhatsappAdsPage"));
const Ajustes            = lazy(() => import("./modules/accesos/pages/Ajustes"));
const Sesiones           = lazy(() => import("./modules/accesos/pages/Sesiones"));
const Reportes           = lazy(() => import("./modules/accesos/pages/Reportes"));
const WaControlPage      = lazy(() => import("./modules/wa/pages/WaControlPage"));
const TransitionRules    = lazy(() => import("./modules/accesos/pages/TransitionRules"));
const SignalScoringRules = lazy(() => import("./modules/accesos/pages/SignalScoringRules"));
const StageTemplatesPage = lazy(() => import("./pages/StageTemplatesPage"));
const OffersPage         = lazy(() => import("./pages/OffersPage"));
const MetaConfigPage     = lazy(() => import("./pages/MetaConfigPage"));
const FcaConfigPage      = lazy(() => import("./pages/FcaConfigPage"));
const ProfilePage        = lazy(() => import("./pages/ProfilePage"));
const VentasPage         = lazy(() => import("./modules/accesos/pages/VentasPage"));
const SocialPostingsPage = lazy(() => import("./pages/SocialPostingsPage"));

const PageLoader = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
    <img
      src="/logo.svg"
      alt="Agora"
      className="w-36 animate-logo-breathe"
    />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
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
          <Route path="/accesos/welcome" element={<ErrorBoundary variant="section"><Welcome /></ErrorBoundary>} />

          <Route
            path="/agenda"
            element={
              <ProtectedRoute requiredFeature="conversations">
                <ErrorBoundary variant="section"><Agenda /></ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/meta-inbox"
            element={
              <ProtectedRoute requiredFeature="conversations">
                <ErrorBoundary variant="section"><MetaInboxPage /></ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/meta-ads"
            element={
              <ProtectedRoute requiredFeature="conversations">
                <ErrorBoundary variant="section"><WhatsappAdsPage /></ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/accesos/reportes"
            element={
              <ProtectedRoute requiredFeature="reports">
                <ErrorBoundary variant="section"><Reportes /></ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wa-control"
            element={
              <ProtectedRoute requiredFeature="botView">
                <ErrorBoundary variant="section"><WaControlPage /></ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/accesos/ajustes"
            element={
              <ProtectedRoute requiredFeature="settings">
                <ErrorBoundary variant="section"><Ajustes /></ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/accesos/ajustes/usuarios"
            element={
              <ProtectedRoute requiredFeature="settings">
                <ErrorBoundary variant="section"><Usuarios /></ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/accesos/ajustes/roles"
            element={
              <ProtectedRoute requiredFeature="settings">
                <ErrorBoundary variant="section"><Roles /></ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/accesos/ajustes/sesiones"
            element={
              <ProtectedRoute requiredFeature="settings">
                <ErrorBoundary variant="section"><Sesiones /></ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/accesos/ajustes/transicion"
            element={
              <ProtectedRoute requiredFeature="settings">
                <ErrorBoundary variant="section"><TransitionRules /></ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/accesos/ajustes/senales"
            element={
              <ProtectedRoute requiredFeature="settings">
                <ErrorBoundary variant="section"><SignalScoringRules /></ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/accesos/ajustes/ventas"
            element={
              <ProtectedRoute requiredFeature="settings">
                <ErrorBoundary variant="section"><VentasPage /></ErrorBoundary>
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
              <ProtectedRoute requiredFeature="superadmin">
                <ErrorBoundary variant="section"><StageTemplatesPage /></ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/offers"
            element={
              <ProtectedRoute requiredFeature="superadmin">
                <ErrorBoundary variant="section"><OffersPage /></ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/integraciones"
            element={
              <ProtectedRoute requiredFeature="superadmin">
                <ErrorBoundary variant="section"><MetaConfigPage /></ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/integraciones/fca"
            element={
              <ProtectedRoute requiredFeature="superadmin">
                <ErrorBoundary variant="section"><FcaConfigPage /></ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/social-postings"
            element={
              <ProtectedRoute requiredFeature="socialPostings">
                <ErrorBoundary variant="section"><SocialPostingsPage /></ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route path="/perfil" element={<ErrorBoundary variant="section"><ProfilePage /></ErrorBoundary>} />
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
