# AGENTS.md

Instrucciones operativas para trabajar en este repo con Codex/agentes.

## Reglas generales

- Trabajar siempre sobre la rama `main`, salvo instruccion explicita distinta.
- Antes de cambios relevantes, revisar `git status` y no revertir cambios ajenos.
- Mantener fuera del repo todos los secretos. En git solo deben quedar templates sin secrets.
- Los archivos `*.secrets.env` son privados de cada ambiente y no deben versionarse.
- El ambiente de desarrollo se considera solo local. No usar `localhost` ni `127.0.0.1` para pruebas orientadas al VPS o produccion.

## Versionado y releases

Cuando un cambio implique versionamiento o release:

- Seguir el orden semantico de versiones ya usado por el repo.
- Actualizar la version en `README.md`.
- Actualizar la version en `README-OPERACION.md`.
- Actualizar `CHANGELOG.md` con los cambios relevantes.
- Revisar si corresponde actualizar documentacion en `ops/`.
- Cada cambio importante debe quedar asociado al tag correspondiente `vX.Y.Z`.

## Produccion

Produccion corre en VPS Hetzner `vps1`.

- Tailscale IP: `100.67.8.81`
- Ruta del repo en el VPS: `~/agora-platform`
- Dominio operativo: `llevatuplan.cl`
- Para produccion usar siempre `env/prod.vps1.secrets.env`.
- No asumir que hay que configurar NPM/proxy/dominio: ya esta configurado.
- En el VPS, el flujo esperado es hacer `pull` en `~/agora-platform` y recrear/levantar contenedores con Docker Compose.

## Comandos de recreacion en VPS1

Ejecutar desde la raiz del repo `~/agora-platform`.

```bash
docker compose -p stack_redis --env-file env/prod.vps1.secrets.env -f redis/docker-compose.yml up -d
docker compose -p stack_whisper --env-file env/prod.vps1.secrets.env -f whisper/docker-compose.yml up -d
docker compose -p stack_tesseract --env-file env/prod.vps1.secrets.env -f tesseract/docker-compose.yml up -d
docker compose -p stack_infra_pgadmin --env-file env/prod.vps1.secrets.env -f infraestructura/docker-compose.yml up -d
docker compose -p stack_accesos --env-file env/prod.vps1.secrets.env -f accesos/docker-compose.yml up -d --build --force-recreate
docker compose -p stack_agora --env-file env/prod.vps1.secrets.env -f agora/docker-compose.yml up -d --build --force-recreate api_backend_nest websocket frontend
docker compose -p stack_wa_backend --env-file env/prod.vps1.secrets.env -f wa-backend/docker-compose.yml up -d --build --force-recreate
docker compose -p stack_nmp --env-file env/prod.vps1.secrets.env -f nmp/docker-compose.yml up -d
```

Para `n8n`:

```bash
PROFILE=prod.vps1 \
HOST_BIND_IP=100.67.8.81 \
N8N_ENV_FILE=./env/prod.vps1.secrets.env \
docker compose -p stack_n8n -f n8n/docker-compose.yml up -d
```

## Notas para agentes

- Si una tarea pide deploy o validacion en produccion, confirmar explicitamente antes de ejecutar comandos remotos o destructivos.
- Si se necesita operar el VPS, usar `vps1`/Hetzner como destino conceptual y `100.67.8.81` como IP Tailscale.
- Para cambios de codigo, preferir validaciones locales del servicio afectado antes de proponer deploy.
- No documentar secretos reales en commits, issues, changelog ni respuestas.

# Instrucciones para Analisis recurrente propuestas de mejoras basadas en escalabilidad

No hagas cambios todavía.

Analiza el código y detecta funciones, endpoints, servicios, jobs o consultas que puedan degradarse mucho cuando aumente el volumen de datos o peticiones.

Busca especialmente:

1. Loops anidados que puedan crecer como O(n²) o peor.
2. Consultas a base de datos dentro de loops.
3. Endpoints que devuelvan demasiados registros sin paginación.
4. Procesos síncronos que deberían ir a una queue/background job.
5. Operaciones que recalculan datos en cada request y podrían usar cache.
6. Uso ineficiente de arrays, maps, objetos o búsquedas lineales.
7. Llamadas HTTP externas hechas una por una cuando podrían hacerse por lote o con concurrencia controlada.
8. Procesamiento de archivos, imágenes, audios o scraping que pueda bloquear la respuesta del usuario.
9. Consultas SQL/ORM sin índices evidentes para filtros frecuentes.
10. Cualquier función que hoy funcione con pocos datos, pero pueda fallar con miles o millones de registros.

Para cada hallazgo, entrégame:

- Archivo y función afectada.
- Qué problema ves.
- Qué complejidad aproximada tiene actualmente.
- Qué pasaría si aumentan los datos o peticiones.
- Qué mejora recomiendas.
- Nivel de riesgo: bajo, medio o alto.
- Si conviene corregir ahora o solo monitorear.

No modifiques código. Solo realiza este analisis de manera propositiva sin modificar nada.


