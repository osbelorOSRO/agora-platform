import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './styles/theme.css'; // Carga el tema y estilos globales
import { NotificacionProvider } from './context/NotificacionContext';
import { Toaster } from "sonner";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NotificacionProvider> {/* Proveedor de notificaciones */}
      <App />
      <Toaster position="bottom-right" richColors /> {/* Componente de toast */}
    </NotificacionProvider>
  </React.StrictMode>
);
