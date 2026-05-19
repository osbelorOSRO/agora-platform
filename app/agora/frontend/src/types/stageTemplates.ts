export type StageTemplate = {
  id: string;
  stage_actual: string;
  posicion: number | null;
  posibles_match: string;
  es_fallback: boolean;
  procesa_datos: boolean;
  dato_esperado: string | null;
  nuevo_stage: string;
  tipo_respuesta: string;
  activo: boolean;
  stage_route: string | null;
  modo_default: string | null;
  factible: boolean | null;
  decision: string | null;
  accion: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateStageTemplateInput = {
  stage_actual: string;
  posicion?: number | null;
  posibles_match: string;
  es_fallback?: boolean;
  procesa_datos?: boolean;
  dato_esperado?: string | null;
  nuevo_stage: string;
  tipo_respuesta: string;
  activo?: boolean;
  stage_route?: string | null;
  modo_default?: string | null;
  factible?: boolean | null;
  decision?: string | null;
  accion?: string | null;
};

export type UpdateStageTemplateInput = Partial<CreateStageTemplateInput>;

export const ACCION_OPTIONS = ['enviar', 'delegar', 'negociar', 'rechazar', 'avanzar'] as const;
export const DECISION_OPTIONS = ['offer', 'scraper', 'handoff', 'reiniciar'] as const;
export const MODO_DEFAULT_OPTIONS = ['alta', 'portabilidad_postpago', 'habilitacion'] as const;
