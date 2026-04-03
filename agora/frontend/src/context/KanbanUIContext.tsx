import React, { createContext, useContext, useState, ReactNode } from "react";

interface MetaInboxToast {
  id: string;
  actorExternalId: string;
  contentText: string;
}

interface KanbanUIContextType {
  // Filtro y búsqueda
  filtroEstado: "activos" | "inactivos" | "cerrados";
  setFiltroEstado: React.Dispatch<React.SetStateAction<"activos" | "inactivos" | "cerrados">>;
  
  // Chat actual
  clienteActualId: string | null;
  setClienteActualId: React.Dispatch<React.SetStateAction<string | null>>;
  procesoActualId: string | null;
  setProcesoActualId: React.Dispatch<React.SetStateAction<string | null>>;
  tipoIdActual: string | null;
  setTipoIdActual: React.Dispatch<React.SetStateAction<string | null>>;
  
  // Chats abiertos
  chatsAbiertos: string[];
  setChatsAbiertos: React.Dispatch<React.SetStateAction<string[]>>;
  
  // Paneles
  panelActivo: "cliente" | "scraping" | "cierre" | null;
  setPanelActivo: React.Dispatch<React.SetStateAction<"cliente" | "scraping" | "cierre" | null>>;
  
  // Formularios
  mostrarFormulario: boolean;
  setMostrarFormulario: React.Dispatch<React.SetStateAction<boolean>>;
  mostrarEliminar: boolean;
  setMostrarEliminar: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Selector lite
  selectorLiteAbierto: boolean;
  setSelectorLiteAbierto: React.Dispatch<React.SetStateAction<boolean>>;
  
  // Búsqueda
  busquedaId: string;
  setBusquedaId: React.Dispatch<React.SetStateAction<string>>;
  
  // Meta Inbox
  metaInboxUnread: number;
  setMetaInboxUnread: React.Dispatch<React.SetStateAction<number>>;
  metaInboxToasts: MetaInboxToast[];
  setMetaInboxToasts: React.Dispatch<React.SetStateAction<MetaInboxToast[]>>;
  
  // Bot
  botActivo: boolean | null;
  setBotActivo: React.Dispatch<React.SetStateAction<boolean | null>>;
  
  // Usuario
  usuario: string;
  setUsuario: React.Dispatch<React.SetStateAction<string>>;
  
  // Cargando
  cargando: boolean;
  setCargando: React.Dispatch<React.SetStateAction<boolean>>;
}

const KanbanUIContext = createContext<KanbanUIContextType | undefined>(undefined);

export const KanbanUIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filtroEstado, setFiltroEstado] = useState<"activos" | "inactivos" | "cerrados">("activos");
  const [clienteActualId, setClienteActualId] = useState<string | null>(null);
  const [procesoActualId, setProcesoActualId] = useState<string | null>(null);
  const [tipoIdActual, setTipoIdActual] = useState<string | null>(null);
  const [chatsAbiertos, setChatsAbiertos] = useState<string[]>([]);
  const [panelActivo, setPanelActivo] = useState<"cliente" | "scraping" | "cierre" | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarEliminar, setMostrarEliminar] = useState(false);
  const [selectorLiteAbierto, setSelectorLiteAbierto] = useState(false);
  const [busquedaId, setBusquedaId] = useState("");
  const [metaInboxUnread, setMetaInboxUnread] = useState(0);
  const [metaInboxToasts, setMetaInboxToasts] = useState<MetaInboxToast[]>([]);
  const [botActivo, setBotActivo] = useState<boolean | null>(null);
  const [usuario, setUsuario] = useState("");
  const [cargando, setCargando] = useState(true);

  return (
    <KanbanUIContext.Provider
      value={{
        filtroEstado,
        setFiltroEstado,
        clienteActualId,
        setClienteActualId,
        procesoActualId,
        setProcesoActualId,
        tipoIdActual,
        setTipoIdActual,
        chatsAbiertos,
        setChatsAbiertos,
        panelActivo,
        setPanelActivo,
        mostrarFormulario,
        setMostrarFormulario,
        mostrarEliminar,
        setMostrarEliminar,
        selectorLiteAbierto,
        setSelectorLiteAbierto,
        busquedaId,
        setBusquedaId,
        metaInboxUnread,
        setMetaInboxUnread,
        metaInboxToasts,
        setMetaInboxToasts,
        botActivo,
        setBotActivo,
        usuario,
        setUsuario,
        cargando,
        setCargando,
      }}
    >
      {children}
    </KanbanUIContext.Provider>
  );
};

export const useKanbanUI = () => {
  const context = useContext(KanbanUIContext);
  if (!context) {
    throw new Error("useKanbanUI debe usarse dentro de KanbanUIProvider");
  }
  return context;
};
