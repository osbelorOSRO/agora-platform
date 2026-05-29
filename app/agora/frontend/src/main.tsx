import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App';
import './index.css';
import { NotificacionProvider } from './context/NotificacionContext';
import { Toaster } from "sonner";
import { ErrorBoundary } from './components/ErrorBoundary';
import { queryClient } from './lib/queryClient';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary variant="global">
        <NotificacionProvider>
          <App />
          <Toaster position="bottom-right" richColors />
        </NotificacionProvider>
      </ErrorBoundary>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </React.StrictMode>
);
