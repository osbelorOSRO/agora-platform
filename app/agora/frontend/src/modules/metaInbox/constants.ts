export const STATUS_VIEWS = ["OPEN", "ARCHIVED", "CLOSED"] as const;
export type StatusView = (typeof STATUS_VIEWS)[number];

export const THREAD_STATUS_OPTIONS = ["OPEN", "PAUSED", "ARCHIVED", "CLOSED"] as const;
export const ATTENTION_MODE_OPTIONS = ["N8N", "HUMAN", "SYSTEM", "PAUSED"] as const;
export const THREAD_STAGE_OPTIONS = [
  "acepta_oferta",
  "cierre_no_exitoso",
  "delegacion_humano",
  "entrega_datos_lineas",
  "entrega_datos_rut",
  "inicio",
  "intencion_humano",
  "intencion_ofertas",
  "intencion_requisitos",
  "lineas_factibles",
  "lineas_no_factibles",
  "no_acepta_oferta",
  "objeta_ofertas",
  "ofertas_alta",
  "ofertas_porta",
  "otras_solicitudes",
  "requisitos_rechaza_alta",
  "requisitos_rechaza_porta",
  "requisitos_acepta_alta",
  "requisitos_acepta_negociacion",
  "requisitos_acepta_porta",
  "requisitos_datos_lineas",
  "requisitos_datos_rut",
  "requisitos_lineas_factibles",
  "requisitos_lineas_no_factibles",
  "requisitos_objeta_alta",
  "requisitos_objeta_porta",
  "requisitos_oferta_alta",
  "requisitos_oferta_porta",
  "requisitos_rut_factible",
  "requisitos_rut_no_factible",
  "rut_factible",
  "rut_no_factible",
] as const;

export const RENDERABLE_MEDIA = new Set(["audio", "image", "video", "document"]);
