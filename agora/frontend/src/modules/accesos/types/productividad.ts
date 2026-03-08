export interface ProcesoProductividad {
  cliente_id: number;
  proceso_id: number;
  iniciado_por: string;
  fecha_inicio: string;
  fecha_cierre: string | null;
  duracion_valor: number | null; // Valor numérico de duración
  duracion_unidad: string | null; // Unidad de duración: "horas", "días", etc.
  abandonado: boolean;
  ultima_etiqueta: string;
}

export interface ProductividadResumen {
  usuario_id: number;
  username: string;
  rol: string | null;
  desde: string;
  hasta: string;
  total_iniciados: number;
  total_cerrados: number;
  con_intervencion: number;
  duracion_valor_promedio: number;
  duracion_unidad_promedio: number;
  tasa_abandono: number;
  procesos_agrupados: Record<string, number>;
}

export interface ProcesoPorAgente {
  usuario_id: number;
  username: string;
  abiertos?: number;
  cerrados: number;
}
