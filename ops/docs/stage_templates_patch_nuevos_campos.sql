
-- Patch stage_templates desde stage_templates_nuevos_campos.csv
-- Aplica nuevas columnas y sincroniza valores por id.

ALTER TABLE stage_templates
  ADD COLUMN IF NOT EXISTS stage_route varchar(64) NULL,
  ADD COLUMN IF NOT EXISTS modo_default varchar(64) NULL,
  ADD COLUMN IF NOT EXISTS factible boolean NULL,
  ADD COLUMN IF NOT EXISTS decision varchar(32) NULL,
  ADD COLUMN IF NOT EXISTS accion varchar(32) NULL;

WITH data(id, stage_route, modo_default, factible, decision, accion, es_fallback, procesa_datos, tipo_respuesta) AS (
VALUES
  (1, 'lista_opciones', 'portabilidad_postpago', NULL, 'indefinido', 'ENVIAR', false, false, 'respuesta que presente la oferta inicial más adecuada para el caso y deje opciones claras para continuar'),
  (2, 'lista_opciones', NULL, NULL, NULL, NULL, false, false, 'respuesta que solicite el RUT necesario para evaluar factibilidad comercial'),
  (3, 'lista_opciones', NULL, NULL, NULL, NULL, false, false, 'respuesta que indique la derivación a atención humana y la continuidad según horario de atención'),
  (4, 'lista_opciones', NULL, NULL, NULL, NULL, true, false, 'fallback lista de opciones'),
  (5, 'clasificacion_contenido', NULL, NULL, NULL, NULL, false, false, 'respuesta que solicite el RUT necesario para evaluar factibilidad comercial'),
  (6, 'clasificacion_contenido', NULL, NULL, NULL, NULL, false, false, 'respuesta que indique la derivación a atención humana y la continuidad según horario de atención'),
  (7, 'clasificacion_contenido', NULL, NULL, NULL, NULL, false, false, 'respuesta que vuelva a mostrar las opciones iniciales disponibles para continuar'),
  (8, 'clasificacion_contenido', 'portabilidad_postpago', NULL, 'objeta', 'NEGOCIAR', false, false, 'respuesta que aborde la objeción o duda detectada y proponga la alternativa más conveniente según el caso'),
  (9, 'clasificacion_contenido', 'portabilidad_postpago', NULL, 'rechaza', 'DESPEDIR', false, false, 'respuesta de cierre cordial sin continuidad comercial inmediata'),
  (10, 'clasificacion_contenido', NULL, NULL, NULL, NULL, true, false, 'fallback lista de opciones'),
  (11, 'procesar_datos', NULL, NULL, NULL, NULL, false, false, 'respuesta breve de confirmación del dato recibido'),
  (12, 'procesar_datos', NULL, NULL, NULL, NULL, true, false, 'fallback RUT'),
  (13, 'procesar_datos', NULL, true, NULL, NULL, false, true, 'respuesta que informe el resultado de factibilidad comercial y presente las opciones disponibles para continuar'),
  (14, 'procesar_datos', NULL, false, NULL, NULL, false, true, 'respuesta de cierre que explique el motivo de no factibilidad'),
  (15, 'procesar_datos', NULL, true, NULL, NULL, false, true, 'respuesta que informe el resultado de factibilidad comercial y presente las opciones disponibles para continuar'),
  (16, 'procesar_datos', NULL, false, NULL, NULL, false, true, 'respuesta de cierre que explique el motivo de no factibilidad'),
  (17, 'lista_opciones', 'portabilidad_postpago', NULL, 'acepta', 'DELEGAR', false, false, 'respuesta que resuma la oferta de línea nueva, explique próximos pasos y encamine la continuidad'),
  (18, 'lista_opciones', NULL, NULL, NULL, NULL, false, false, 'respuesta que solicite las líneas a portar necesarias para evaluar su factibilidad'),
  (19, 'lista_opciones', NULL, NULL, NULL, NULL, false, false, 'respuesta que indique la derivación a atención humana y la continuidad según horario de atención'),
  (20, 'lista_opciones', NULL, NULL, NULL, NULL, true, false, 'fallback lista de opciones'),
  (21, 'procesar_datos', NULL, NULL, NULL, NULL, false, false, 'respuesta que solicite confirmar las líneas telefónicas que serán portadas'),
  (22, 'procesar_datos', NULL, NULL, NULL, NULL, true, false, 'fallback numeros telefonicos'),
  (23, 'procesar_datos', 'portabilidad_postpago', false, 'acepta', 'DELEGAR', false, true, 'respuesta que resuma la oferta de portabilidad, explique próximos pasos y encamine la continuidad'),
  (24, 'procesar_datos', NULL, false, NULL, NULL, false, true, 'respuesta que proponga continuar con una oferta de línea nueva como alternativa'),
  (25, 'procesar_datos', 'portabilidad_postpago', true, 'acepta', 'DELEGAR', false, true, 'respuesta que resuma la oferta de portabilidad, explique próximos pasos y encamine la continuidad'),
  (26, 'procesar_datos', NULL, false, NULL, NULL, false, true, 'respuesta que proponga continuar con una oferta de línea nueva como alternativa'),
  (27, 'clasificacion_contenido', 'portabilidad_postpago', NULL, 'acepta', 'DELEGAR', false, false, 'respuesta que resuma la oferta de línea nueva, explique próximos pasos y encamine la continuidad'),
  (28, 'clasificacion_contenido', NULL, NULL, NULL, NULL, false, false, 'respuesta de cierre cordial sin continuidad comercial inmediata'),
  (29, 'clasificacion_contenido', NULL, NULL, NULL, NULL, false, false, 'respuesta que solicite el RUT necesario para evaluar factibilidad comercial'),
  (30, 'clasificacion_contenido', NULL, NULL, NULL, NULL, false, false, 'respuesta que indique la derivación a atención humana y la continuidad según horario de atención'),
  (31, 'clasificacion_contenido', NULL, NULL, NULL, NULL, false, false, 'respuesta que vuelva a mostrar las opciones iniciales disponibles para continuar'),
  (32, 'clasificacion_contenido', 'portabilidad_postpago', NULL, 'objeta', 'NEGOCIAR', false, false, 'respuesta que aborde la objeción o duda detectada y proponga la alternativa más conveniente según el caso'),
  (33, 'clasificacion_contenido', 'portabilidad_postpago', NULL, 'rechaza', 'DESPEDIR', false, false, 'respuesta de cierre cordial sin continuidad comercial inmediata'),
  (34, 'clasificacion_contenido', NULL, NULL, NULL, NULL, true, false, 'fallback objeciones'),
  (35, 'procesar_datos', NULL, NULL, NULL, NULL, false, false, 'respuesta que solicite confirmar el RUT recibido antes de continuar'),
  (36, 'procesar_datos', NULL, NULL, NULL, NULL, true, false, 'fallback RUT'),
  (37, 'procesar_datos', NULL, true, NULL, NULL, false, true, 'respuesta que informe el resultado de factibilidad comercial y presente las opciones disponibles para continuar'),
  (38, 'procesar_datos', NULL, true, NULL, NULL, false, true, 'respuesta que informe el resultado de factibilidad comercial y presente las opciones disponibles para continuar'),
  (39, 'lista_opciones', 'alta', NULL, 'indefinido', 'ENVIAR', false, false, 'respuesta que presente una oferta de línea nueva y muestre opciones claras para continuar'),
  (40, 'lista_opciones', NULL, NULL, NULL, NULL, false, false, 'respuesta que solicite las líneas a portar necesarias para evaluar su factibilidad'),
  (41, 'lista_opciones', NULL, NULL, NULL, NULL, false, false, 'respuesta que indique la derivación a atención humana y la continuidad según horario de atención'),
  (42, 'lista_opciones', NULL, NULL, NULL, NULL, true, false, 'fallback lista de opciones'),
  (43, 'procesar_datos', NULL, NULL, NULL, NULL, false, false, 'respuesta que solicite confirmar las líneas telefónicas que serán portadas'),
  (44, 'procesar_datos', NULL, NULL, NULL, NULL, true, false, 'fallback numeros telefonicos'),
  (45, 'procesar_datos', 'portabilidad_postpago', true, 'indefinido', 'ENVIAR', false, true, 'respuesta que presente una oferta de portabilidad y muestre opciones claras para continuar'),
  (46, 'procesar_datos', NULL, false, NULL, NULL, false, true, 'respuesta que explique la no factibilidad de las líneas evaluadas y ofrezca continuar con línea nueva'),
  (47, 'procesar_datos', 'portabilidad_postpago', true, 'indefinido', 'ENVIAR', false, true, 'respuesta que presente una oferta de portabilidad y muestre opciones claras para continuar'),
  (48, 'procesar_datos', NULL, false, NULL, NULL, false, true, 'respuesta que explique la no factibilidad de las líneas evaluadas y ofrezca continuar con línea nueva'),
  (49, 'lista_opciones', 'alta', NULL, 'indefinido', 'ENVIAR', false, false, 'respuesta que presente una oferta de línea nueva y muestre opciones claras para continuar'),
  (50, 'lista_opciones', NULL, NULL, NULL, NULL, false, false, 'respuesta de cierre cordial sin continuidad comercial inmediata'),
  (51, 'lista_opciones', 'portabilidad_postpago', NULL, 'indefinido', 'ENVIAR', false, false, 'respuesta que presente la oferta inicial más adecuada para el caso y deje opciones claras para continuar'),
  (52, 'lista_opciones', NULL, NULL, NULL, NULL, false, false, 'respuesta que solicite el RUT necesario para evaluar factibilidad comercial'),
  (53, 'lista_opciones', NULL, NULL, NULL, NULL, false, false, 'respuesta que indique la derivación a atención humana y la continuidad según horario de atención'),
  (54, 'lista_opciones', NULL, NULL, NULL, NULL, false, false, 'respuesta de cierre cordial sin continuidad comercial inmediata'),
  (55, 'clasificacion_contenido', 'alta', NULL, 'acepta', 'DELEGAR', false, false, 'respuesta que resuma la oferta de línea nueva, explique próximos pasos y encamine la continuidad'),
  (56, 'clasificacion_contenido', NULL, NULL, NULL, NULL, false, false, 'respuesta que indique la derivación a atención humana y la continuidad según horario de atención'),
  (57, 'clasificacion_contenido', NULL, NULL, NULL, NULL, false, false, 'respuesta que vuelva a mostrar las opciones iniciales disponibles para continuar'),
  (58, 'clasificacion_contenido', 'alta', NULL, 'objeta', 'NEGOCIAR', false, false, 'respuesta que aborde la objeción o duda detectada y proponga la alternativa más conveniente según el caso'),
  (59, 'clasificacion_contenido', 'alta', NULL, 'rechaza', 'DESPEDIR', false, false, 'respuesta de cierre cordial sin continuidad comercial inmediata'),
  (60, 'clasificacion_contenido', NULL, NULL, NULL, NULL, true, false, 'fallback lista de opciones'),
  (61, 'clasificacion_contenido', 'alta', NULL, 'acepta', 'DELEGAR', false, false, 'respuesta que entregue una propuesta ajustada por negociación, con próximos pasos y continuidad'),
  (62, 'clasificacion_contenido', NULL, NULL, NULL, NULL, false, false, 'respuesta que indique la derivación a atención humana y la continuidad según horario de atención'),
  (63, 'clasificacion_contenido', NULL, NULL, NULL, NULL, false, false, 'respuesta que vuelva a mostrar las opciones iniciales disponibles para continuar'),
  (64, 'clasificacion_contenido', 'alta', NULL, 'rechaza', 'DESPEDIR', false, false, 'respuesta de cierre cordial sin continuidad comercial inmediata'),
  (65, 'clasificacion_contenido', NULL, NULL, NULL, NULL, true, false, 'fallback objeciones'),
  (66, 'clasificacion_contenido', 'portabilidad_postpago', NULL, 'acepta', 'DELEGAR', false, false, 'respuesta que resuma la oferta de portabilidad, explique próximos pasos y encamine la continuidad'),
  (67, 'clasificacion_contenido', NULL, NULL, NULL, NULL, false, false, 'respuesta que indique la derivación a atención humana y la continuidad según horario de atención'),
  (68, 'clasificacion_contenido', NULL, NULL, NULL, NULL, false, false, 'respuesta que vuelva a mostrar las opciones iniciales disponibles para continuar'),
  (69, 'clasificacion_contenido', 'portabilidad_postpago', NULL, 'objeta', 'NEGOCIAR', false, false, 'respuesta que aborde la objeción o duda detectada y proponga la alternativa más conveniente según el caso'),
  (70, 'clasificacion_contenido', 'portabilidad_postpago', NULL, 'rechaza', 'DESPEDIR', false, false, 'respuesta de cierre cordial sin continuidad comercial inmediata'),
  (71, 'clasificacion_contenido', NULL, NULL, NULL, NULL, true, false, 'fallback lista de opciones'),
  (72, 'clasificacion_contenido', 'portabilidad_postpago', NULL, 'acepta', 'DELEGAR', false, false, 'respuesta que entregue una propuesta ajustada por negociación, con próximos pasos y continuidad'),
  (73, 'clasificacion_contenido', NULL, NULL, NULL, NULL, false, false, 'respuesta que indique la derivación a atención humana y la continuidad según horario de atención'),
  (74, 'clasificacion_contenido', NULL, NULL, NULL, NULL, false, false, 'respuesta que vuelva a mostrar las opciones iniciales disponibles para continuar'),
  (75, 'clasificacion_contenido', 'portabilidad_postpago', NULL, 'rechaza', 'DESPEDIR', false, false, 'respuesta de cierre cordial sin continuidad comercial inmediata'),
  (76, 'clasificacion_contenido', NULL, NULL, NULL, NULL, true, false, 'fallback objeciones'),
  (77, 'procesar_datos', NULL, false, NULL, NULL, false, true, 'respuesta de cierre que explique el motivo de no factibilidad'),
  (78, 'procesar_datos', NULL, false, NULL, NULL, false, true, 'respuesta de cierre que explique el motivo de no factibilidad')
)
UPDATE stage_templates st
SET
  stage_route = d.stage_route,
  modo_default = d.modo_default,
  factible = d.factible,
  decision = d.decision,
  accion = d.accion,
  es_fallback = d.es_fallback,
  procesa_datos = d.procesa_datos,
  tipo_respuesta = d.tipo_respuesta,
  updated_at = now()
FROM data d
WHERE st.id = d.id;


-- Verificacion rapida
SELECT id, stage_actual, stage_route, modo_default, factible, decision, accion, es_fallback, procesa_datos, tipo_respuesta
FROM stage_templates
ORDER BY id;
