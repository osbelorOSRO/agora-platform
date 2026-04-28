# DOC-DEVOPS-META-INBOX-HANDOFF

Fecha: 2026-04-28

## Objetivo

Dejar lista la preparación de despliegue para `VPS1` de todo lo trabajado en esta conversación sobre:

- `meta-inbox`
- `threads`
- `thread_messages`
- delegación de conversaciones hacia `n8n`
- `stage_templates`

## Componentes y versión objetivo

- `api-backend-nest`: `1.3.0`
- `frontend`: `1.3.0`
- `panel_websocket`: `1.3.0`
- `abackend`: `1.3.0`
- `wa-backend`: `1.3.0`

Nota: `v1.3.0` es un corte integral de repo. Todos los paquetes operativos quedan alineados.

## Cambios funcionales incluidos

- capa operativa `threads`
- historial único `thread_messages`
- bootstrap de nuevo thread con `bootstrap_greeting`
- bloqueo de delegación del primer incoming con `awaiting_first_incoming_delegate`
- separación del webhook de scoring vs webhook de conversaciones delegadas
- endpoints `n8n` para:
  - resolver thread
  - actualizar control del thread
  - actualizar contacto
  - enviar mensaje
- endpoint de lectura de matriz:
  - `GET /meta-inbox/stage-templates/:stageActual`
- actualización del panel para reflejar stages en tiempo real vía websocket notifier
- actualización de la lista de stages del panel según matriz real

## SQL que debe aplicarse en VPS1

Para el corte actual, usar primero el runbook:

- [DOC-RELEASE-1.3.0-VPS-POSTGRES.md](/home/oscar/Documentos/GitHub/agora-platform/ops/docs/DOC-RELEASE-1.3.0-VPS-POSTGRES.md:1)

### 1. Estructura operativa del inbox

Ejecutar:

- [DOC-META-INBOX-THREADS-SQL.md](/home/oscar/Documentos/GitHub/agora-platform/ops/docs/DOC-META-INBOX-THREADS-SQL.md:1)

Esto cubre:

- `threads`
- `thread_messages`
- índices
- backfill legacy
- `awaiting_first_incoming_delegate`

### 2. Matriz de stages

Ejecutar:

- [stage_templates_final.sql](/home/oscar/Documentos/GitHub/agora-platform/ops/docs/stage_templates_final.sql:1)

Si la tabla ya existe y se quiere recargar completa:

```sql
TRUNCATE TABLE stage_templates RESTART IDENTITY;
```

y luego ejecutar nuevamente el `INSERT` de `stage_templates_final.sql`.

## Orden recomendado en pgAdmin para VPS1

1. verificar conexión a la base correcta de `api_backend_nest`
2. ejecutar `DOC-META-INBOX-THREADS-SQL.md`
3. validar que existan:
   - `threads`
   - `thread_messages`
4. ejecutar `stage_templates_final.sql`
5. validar:

```sql
SELECT COUNT(*) FROM stage_templates;
```

```sql
SELECT stage_actual, posicion, nuevo_stage, activo
FROM stage_templates
ORDER BY stage_actual, posicion NULLS LAST, id;
```

## Variables y configuración a revisar

### Backend

Revisar que existan y apunten al entorno correcto:

- `N8N_THREAD_MSG_DELEGATION_WEBHOOK_URL`
- `N8N_MSG_DELEGATION_WEBHOOK_URL`
- `N8N_SECRET_TOKEN`
- `MEDIA_BASE_URL`

### Meta / infraestructura

Revisar:

- webhook de Meta apuntando al entorno correcto
- `n8n` disponible en la URL configurada
- Redis sano
- websocket sano

## Rebuild recomendado

Como mínimo:

```bash
cd /home/oscar/Documentos/GitHub/agora-platform
docker compose -p stack_agora --env-file env/dev.local1.env -f agora/docker-compose.yml up -d --build api_backend_nest frontend
```

`panel_websocket` no requiere rebuild por cambios de esta conversación, salvo que DevOps quiera recrear toda la stack.

## Smoke tests recomendados

### 1. Matriz de stages

```bash
curl http://apist.zaldio.qzz.io/meta-inbox/stage-templates/inicio
```

Esperado:

- responde `stage_actual`
- responde `caminos`
- omite campos `null`

### 2. Lista de threads

```bash
curl http://apist.zaldio.qzz.io/meta-inbox/threads
```

Esperado:

- lista threads visibles
- incluye `threadStatus`, `attentionMode`, `threadStage`

### 3. Cambio de control de thread

Probar desde panel o desde endpoint `n8n`:

- cambio de `thread_stage`
- cambio de `attention_mode`
- cambio de `thread_status`

Esperado:

- persiste en `threads`
- se refleja en panel si `MetaInboxPage` está abierta y escuchando websocket

### 4. Stage templates en panel

Esperado:

- el selector de stage muestra los valores unificados actuales

## Documentos relacionados

- [DOC-META-INBOX-THREADS-SQL.md](/home/oscar/Documentos/GitHub/agora-platform/ops/docs/DOC-META-INBOX-THREADS-SQL.md:1)
- [DOC-N8N-META-THREAD-DELEGATION.md](/home/oscar/Documentos/GitHub/agora-platform/ops/docs/DOC-N8N-META-THREAD-DELEGATION.md:1)
- [DOC-VPS1-VALIDACION-META-THREADS.md](/home/oscar/Documentos/GitHub/agora-platform/ops/docs/DOC-VPS1-VALIDACION-META-THREADS.md:1)
- [stage_templates_final.sql](/home/oscar/Documentos/GitHub/agora-platform/ops/docs/stage_templates_final.sql:1)

## Cambios locales que no deberían subirse al repo

Antes de preparar commit, revisar estos elementos:

- `env/dev.local1.env`
- `n8n/env/dev.local1.env`
- archivos multimedia temporales bajo `agora/uploads/*.m4a`

Notas:

- los `env` pueden contener ajustes locales temporales
- los `.m4a` fueron artefactos de prueba y no son parte del cambio funcional

## Checklist de salida para DevOps

- SQL de `threads/thread_messages` aplicado
- SQL de `stage_templates` aplicado
- limpieza PostgreSQL legacy de `v1.3.0` aplicada si corresponde
- `api-backend-nest`, `frontend`, `panel_websocket`, `abackend` y `wa-backend` en `1.3.0`
- rebuild ejecutado
- smoke tests mínimos validados
- cambios locales temporales excluidos del commit
