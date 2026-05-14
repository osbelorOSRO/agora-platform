# DOC-RUNBOOKS

## 1) Bootstrap host nuevo

1. Instalar Docker/Compose.
2. Unir host a Tailscale.
3. Crear red compartida:
   ```bash
   docker network create --driver bridge npm_network
   ```
4. Levantar servicios externos al repo (con compose propios en el host):
   - Postgres — compose en el host
   - Redis — compose propio en el host, levantar desde la ruta donde este ubicado
   - Nginx Proxy Manager — compose propio en el host, levantar desde la ruta donde este ubicado
5. Clonar el repo y preparar secretos:
   ```bash
   cp app/env/dev.local1.env app/env/dev.local1.secrets.env
   cp n8n/env/dev.local1.env n8n/env/dev.local1.secrets.env
   # completar *.secrets.env con valores reales
   ```

## 2) Pre-deploy checklist

1. Seleccionar perfil correcto (`APP_ENV`, `TARGET_HOST`).
2. Inicializar `.env` de servicios no versionados si faltan:
   ```bash
   ./scripts/init-service-envs.sh
   ```
3. Completar valores reales en:
   - `app/env/<perfil>.secrets.env`
   - `n8n/env/<perfil>.secrets.env`
   - `app/agora/api-backend-nest/.env`
   - `app/agora/websocket/.env`
   - `app/accesos/abackend/.env`
   - `app/wa-backend/.env`
4. Validar env y compose:
   ```bash
   ./scripts/verify-env.sh <perfil>
   ./scripts/verify-compose.sh <perfil>
   ```
5. Confirmar existencia de red `npm_network`.

## 3) Deploy base

1. Levantar servicios externos (Redis, NPM, Postgres).
2. Levantar stack de app:
   ```bash
   ./scripts/up-profile.sh <perfil>
   ```
3. Verificar salud de contenedores y logs iniciales.
4. Smoke operativo:
   ```bash
   ./scripts/smoke-core.sh <perfil>
   ```

### 3.1) config-bot.json (wa-backend)

Si el contenedor crashea con `EISDIR` al pausar el bot, significa que Docker montó un directorio en lugar del archivo:

```bash
sudo rm -rf app/wa-backend/config-bot.json
echo '{"automationPaused":false}' > app/wa-backend/config-bot.json
docker compose -p stack_wa_backend --env-file app/env/<perfil>.secrets.env -f app/wa-backend/docker-compose.yml up -d --force-recreate
```

## 4) Rollback

1. Detener servicios impactados.
2. Restaurar versión previa con `git checkout <tag>` o revertir el compose/env.
3. Levantar versión anterior.
4. Verificar health y flujos críticos.

## 5) Backup/restore validación

1. Verificar que backups existen y son recientes.
2. Restaurar en entorno de prueba (VPS2).
3. Ejecutar smoke contra datos restaurados.
4. Documentar resultado y timestamp.

## 6) Vault

Vault es el gestor centralizado de secretos del stack. Los servicios que lo consumen lo hacen en arranque: leen sus variables sensibles desde Vault en lugar de depender exclusivamente de archivos `.env` locales.

### Qué servicios lo usan

| Servicio | Para qué |
|---|---|
| `api-backend-nest` | Claves de JWT, tokens internos, API keys de integraciones |
| `websocket` | Token compartido con `api-backend-nest` (`API_KEY_WS`) |
| `abackend` | Claves de firma JWT, claves RSA públicas/privadas |
| `n8n` | Credenciales de automatizaciones y accesos a servicios externos |

### Qué debe configurar el desarrollador en un host nuevo

1. **Levantar una instancia de Vault** accesible desde la red Docker del host (`npm_network`).
2. **Habilitar el motor KV** (`kv-v2`) en la ruta que el host usará (ej. `secret/<perfil>/<servicio>`).
3. **Crear un AppRole por servicio** con policy estricta al path del secreto que le corresponde. Cada servicio solo debe poder leer su propio path.
4. **Cargar los secretos** en los paths correspondientes.
5. **Configurar en el `.env` de cada servicio:**
   - `VAULT_ADDR` — dirección del contenedor Vault en la red Docker (usar nombre de contenedor, no `127.0.0.1`)
   - `VAULT_ROLE_ID` y `VAULT_SECRET_ID` — credenciales del AppRole del servicio

### Cómo sabe el servicio dónde está Vault

Cada servicio resuelve `VAULT_ADDR` desde su propio `.env` (no versionado). Si ese valor está mal o si hay un `export VAULT_ADDR` activo en la sesión shell al levantar el stack, ese valor de shell pisa al del archivo y el contenedor apuntará a la dirección incorrecta.

> **Regla operativa:** no dejar `export VAULT_ADDR` en la sesión shell al operar `docker compose`. Usar prefijo inline (`VAULT_ADDR=... vault kv ...`) o abrir una terminal nueva.

### Documentación de referencia

- Mapa completo de secretos por servicio y path: `ops/docs/DOC-SECRETS-MAP-VAULT.md`
- AppRoles, policies y bootstrap de n8n: `ops/docs/DOC-N8N-VAULT-APPROLE.md`
- Gestión del secreto compartido entre servicios: `README-OPERACION.md` → sección "Vault compartido entre api_backend_nest y websocket"
