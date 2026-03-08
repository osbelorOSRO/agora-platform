// src/types/Cliente.ts
export interface Cliente {
  cliente_id: string;
  tipo_id: string;
  nombre?: string | null;
  estado_actual: number;
  etiqueta_actual?: string | null; // 🔥 AGREGADO - Viene del backend
  intervenida: boolean;
  foto_perfil?: string;
  telefono?: string | null;
}

export interface ClientCardProps {
  cliente: Cliente;
  onChat: (clienteId: string) => void;
  esActivo: boolean;
}

export interface ClienteConEtiqueta extends Cliente {
  nombre_etiqueta: string | null;
}

export interface CrearEtiquetaPayload {
  nombre_etiqueta: string;
}

export interface ActualizarEtiquetaPayload {
  etiqueta_id: number;
  fuente: 'bot' | 'humano';
}

export interface IntervencionContexto {
  cliente_id: string;
  solicitado_por_id: number;
  delegado_a_id?: number;
  origen?: string;
  motivo?: string;
}

export interface RespuestaIntervencion {
  success: boolean;
  cliente_id: string;
  ya_intervenido: boolean;
  intervenida: boolean;
  mensaje: string;
  proceso_id?: number;
  origen?: string;
  motivo?: string;
  delegado_a?: number;
  iniciado_por?: number;
}

// Cliente reducido usado en Clientes Lite
export interface ClienteLite {
  cliente_id: string;
  nombre?: string | null;
  foto_perfil?: string | null;
}
