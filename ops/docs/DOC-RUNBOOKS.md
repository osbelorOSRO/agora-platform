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
   - Redis — `sudo docker compose -p stack_redis --env-file /root/redis/.env -f /root/redis/docker-compose.yml up -d`
   - Nginx Proxy Manager — `sudo docker compose -p stack_npm -f /root/nginx-proxy-manager/docker-compose.yml up -d`
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

### 3.1) Permisos persistentes (`uploads`)

Objetivo: evitar errores `EACCES` al subir archivos en host nuevo o ruta nueva.

```bash
cd <repo_root>/app/agora
sudo mkdir -p uploads
sudo chown -R 1000:1000 uploads
sudo find uploads -type d -exec chmod 775 {} \;
sudo find uploads -type f -exec chmod 664 {} \;
```

Validar dentro del contenedor:
```bash
docker exec -it api_backend_nest sh -lc 'touch /app/uploads/.perm_check && ls -l /app/uploads/.perm_check'
```

Si falla, recrear solo el servicio:
```bash
docker compose -p stack_agora --env-file app/env/<perfil>.secrets.env -f app/agora/docker-compose.yml up -d --force-recreate api_backend_nest
```

### 3.2) config-bot.json (wa-backend)

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

## 6) Vault (prod.vps1)

Vault corre en contenedor `vault-vault-1` en VPS1. Auto-unseal vía Transit Seal desde VPS2.

Verificar estado:
```bash
docker logs vault-vault-1 | tail -20
```

Operar secretos (requiere `VAULT_TOKEN`):
```bash
sudo docker exec \
  -e VAULT_ADDR=http://127.0.0.1:8200 \
  -e VAULT_TOKEN="$VAULT_TOKEN" \
  vault-vault-1 vault kv get secret/prod.vps1/agora/api-backend-nest
```

Paths de secretos en prod.vps1:
- `secret/prod.vps1/agora/api-backend-nest`
- `secret/prod.vps1/agora/websocket`
- `secret/n8n/prod.vps1`
- `secret/accesos/keys/private` / `secret/accesos/keys/public`

AppRoles: `api-backend-nest`, `websocket`, `abackend`, `n8n` — cada uno con policy estricta a su path.

Nota operativa: no exportar `VAULT_ADDR` en la sesión shell antes de levantar stacks — pisa el `--env-file` de docker compose. Usar prefijo inline o terminal nueva.
