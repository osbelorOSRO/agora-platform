import React, { createContext, useContext, useState, ReactNode } from "react";
import { Cliente } from "../types/Cliente";

interface KanbanContextType {
  // Clientes
  clientesActivos: Cliente[];
  setClientesActivos: React.Dispatch<React.SetStateAction<Cliente[]>>;
  clientesInactivos: Cliente[];
  setClientesInactivos: React.Dispatch<React.SetStateAction<Cliente[]>>;
  clientesCerrados: Cliente[];
  setClientesCerrados: React.Dispatch<React.SetStateAction<Cliente[]>>;
  
  // Procesos
  procesosPorCliente: Record<string, string>;
  setProcesosPorCliente: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  
  // Búsqueda
  resultadoBusqueda: Cliente | null;
  setResultadoBusqueda: React.Dispatch<React.SetStateAction<Cliente | null>>;
}

const KanbanContext = createContext<KanbanContextType | undefined>(undefined);

export const KanbanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clientesActivos, setClientesActivos] = useState<Cliente[]>([]);
  const [clientesInactivos, setClientesInactivos] = useState<Cliente[]>([]);
  const [clientesCerrados, setClientesCerrados] = useState<Cliente[]>([]);
  const [procesosPorCliente, setProcesosPorCliente] = useState<Record<string, string>>({});
  const [resultadoBusqueda, setResultadoBusqueda] = useState<Cliente | null>(null);

  return (
    <KanbanContext.Provider
      value={{
        clientesActivos,
        setClientesActivos,
        clientesInactivos,
        setClientesInactivos,
        clientesCerrados,
        setClientesCerrados,
        procesosPorCliente,
        setProcesosPorCliente,
        resultadoBusqueda,
        setResultadoBusqueda,
      }}
    >
      {children}
    </KanbanContext.Provider>
  );
};

export const useKanban = () => {
  const context = useContext(KanbanContext);
  if (!context) {
    throw new Error("useKanban debe usarse dentro de KanbanProvider");
  }
  return context;
};
