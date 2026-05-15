-- Actualización de tipo_respuesta para filas fallback en stage_templates
-- Fecha: 2026-05-14
-- Contexto: los textos anteriores eran descriptores internos, no mensajes para el cliente.
--           RAG ahora usa tipo_respuesta directamente como texto a enviar cuando decision=fallback.
-- Ejecutar en: memoriabot (dev.local1 y VPS1)

UPDATE stage_templates SET tipo_respuesta = 'Puedo ayudarte a ver ofertas disponibles o revisar si puedes contratar. ¿Qué prefieres?'
  WHERE stage_actual = 'inicio' AND es_fallback = true AND activo = true;

UPDATE stage_templates SET tipo_respuesta = '¿Te interesa la oferta, tienes alguna consulta o prefieres hablar con un ejecutivo?'
  WHERE stage_actual = 'intencion_ofertas' AND es_fallback = true AND activo = true;

UPDATE stage_templates SET tipo_respuesta = 'Para evaluar si puedes contratar necesito que me indiques tu RUT.'
  WHERE stage_actual = 'intencion_requisitos' AND es_fallback = true AND activo = true;

UPDATE stage_templates SET tipo_respuesta = 'Para continuar necesito que me indiques tu RUT.'
  WHERE stage_actual = 'acepta_oferta' AND es_fallback = true AND activo = true;

UPDATE stage_templates SET tipo_respuesta = '¿Puedes contarme qué es lo que no te convence de la oferta?'
  WHERE stage_actual = 'objeta_ofertas' AND es_fallback = true AND activo = true;

UPDATE stage_templates SET tipo_respuesta = '¿Puedes contarme qué es lo que no te convence?'
  WHERE stage_actual = 'requisitos_objeta_alta' AND es_fallback = true AND activo = true;

UPDATE stage_templates SET tipo_respuesta = '¿Puedes contarme qué es lo que no te convence de la portabilidad?'
  WHERE stage_actual = 'requisitos_objeta_porta' AND es_fallback = true AND activo = true;

UPDATE stage_templates SET tipo_respuesta = 'Para continuar con la portabilidad necesito que me indiques el número o los números que quieres portar.'
  WHERE stage_actual = 'ofertas_porta' AND es_fallback = true AND activo = true;

UPDATE stage_templates SET tipo_respuesta = 'Para continuar con la portabilidad necesito que me indiques el número o los números que quieres portar.'
  WHERE stage_actual = 'requisitos_oferta_porta' AND es_fallback = true AND activo = true;

UPDATE stage_templates SET tipo_respuesta = '¿Te interesa la oferta, tienes alguna consulta o prefieres hablar con un ejecutivo?'
  WHERE stage_actual = 'requisitos_lineas_factibles' AND es_fallback = true AND activo = true;

UPDATE stage_templates SET tipo_respuesta = '¿Te interesa la oferta, tienes alguna consulta o prefieres hablar con un ejecutivo?'
  WHERE stage_actual = 'requisitos_oferta_alta' AND es_fallback = true AND activo = true;

UPDATE stage_templates SET tipo_respuesta = '¿Prefieres contratar una línea nueva o portar tu número desde otra compañía?'
  WHERE stage_actual = 'requisitos_rut_factible' AND es_fallback = true AND activo = true;

UPDATE stage_templates SET tipo_respuesta = '¿Quieres contratar una línea nueva, portar tu número o prefieres hablar con un ejecutivo?'
  WHERE stage_actual = 'rut_factible' AND es_fallback = true AND activo = true;

-- Verificación post-aplicación
SELECT stage_actual, tipo_respuesta
  FROM stage_templates
  WHERE es_fallback = true AND activo = true
  ORDER BY stage_actual;
