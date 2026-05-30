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

export const LEAD_TYPE_OPTIONS = [
  { value: "DESCONOCIDO", label: "Desconocido" },
  { value: "LEAD", label: "Lead (de anuncio)" },
  { value: "ORGANICO", label: "Orgánico" },
] as const;

export const AGE_RANGE_OPTIONS = [
  { value: "NO_DEFINIDO", label: "Sin definir" },
  { value: "RANGO_18_24", label: "18 – 24" },
  { value: "RANGO_25_34", label: "25 – 34" },
  { value: "RANGO_35_44", label: "35 – 44" },
  { value: "RANGO_45_54", label: "45 – 54" },
  { value: "RANGO_55_64", label: "55 – 64" },
  { value: "RANGO_65_PLUS", label: "65+" },
] as const;

export const SEX_OPTIONS = [
  { value: "NO_IDENTIFICADO", label: "No identificado" },
  { value: "MASCULINO", label: "Masculino" },
  { value: "FEMENINO", label: "Femenino" },
] as const;

export const CUSTOMER_TYPE_OPTIONS = [
  { value: "NO_DEFINIDO", label: "Sin definir" },
  { value: "AUTONOMO", label: "Autónomo" },
  { value: "ASISTIDO", label: "Asistido" },
  { value: "ABANDONO_BOT", label: "Abandonó bot" },
  { value: "DIRECTO", label: "Directo" },
] as const;

export const PURCHASE_INTENT_OPTIONS = [
  { value: "NO_DEFINIDO", label: "Sin definir" },
  { value: "LINEA_NUEVA", label: "Línea nueva" },
  { value: "PORTABILIDAD", label: "Portabilidad" },
] as const;

export const RESULT_OPTIONS = [
  { value: "EN_PROCESO", label: "En proceso" },
  { value: "GANADO", label: "Ganado" },
  { value: "PERDIDO", label: "Perdido" },
] as const;

export const SALE_TYPE_OPTIONS = [
  { value: "NO_DEFINIDO", label: "Sin definir" },
  { value: "PORTABILIDAD_POSTPAGO", label: "Portabilidad postpago" },
  { value: "PORTABILIDAD_PREPAGO", label: "Portabilidad prepago" },
  { value: "ALTA", label: "Alta" },
  { value: "SALTA", label: "Salta" },
] as const;

export const LOSS_REASON_OPTIONS = [
  { value: "NO_CALIFICO_SCORE", label: "No calificó score Movistar" },
  { value: "NUMERO_NO_PORTABLE", label: "Número no portable" },
  { value: "PRECIO_NO_CONVENCIO", label: "Precio no convenció" },
  { value: "DECIDIO_NO_CONTRATAR", label: "Decidió no contratar" },
  { value: "NO_RESPONDIO_MAS", label: "No respondió más" },
  { value: "DERIVADO_TIENDA_FISICA", label: "Derivado a tienda física" },
  { value: "OTRO", label: "Otro" },
] as const;

export const VERBALIZATION_TAG_OPTIONS = [
  { value: "objecion_precio", label: "Objeción de precio" },
  { value: "duda_tecnica", label: "Duda técnica" },
  { value: "comparacion_competencia", label: "Comparación con competencia" },
  { value: "frase_cierre", label: "Frase de cierre" },
  { value: "frase_abandono", label: "Frase de abandono" },
  { value: "elogio_servicio", label: "Elogio del servicio" },
  { value: "confusion_proceso", label: "Confusión con el proceso" },
  { value: "pregunta_frecuente", label: "Pregunta frecuente" },
] as const;
