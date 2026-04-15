# DOC-RUNBOOKS

## 1) Bootstrap host nuevo
1. Instalar Docker/Compose.
2. Unir host a Tailscale.
3. Crear red compartida:
   - `docker network create --driver bridge npm_network`
4. Preparar rutas fuera de repo para estado sensible (`/root/...` o ruta operativa definida).

## 2) Pre-deploy checklist
1. Seleccionar perfil correcto (`APP_ENV`, `TARGET_HOST`).
2. Inicializar `.env` de servicios no versionados (si faltan):
   - `./scripts/init-service-envs.sh`
3. Completar valores reales en:
   - `env/<perfil>.env` (o `env/<perfil>.secrets.env`)
   - `agora/api-backend-nest/.env`
   - `agora/websocket/.env`
   - `accesos/abackend/.env`
   - `wa-backend/.env`
4. Validar env cargado sin vacíos críticos (DB, Vault, URLs públicas).
5. Validar compose (`docker compose config`) de cada stack.
6. Confirmar existencia de red `npm_network`.
7. Ejecutar scripts de verificación:
   - `./scripts/verify-env.sh <perfil>`
   - `./scripts/verify-compose.sh <perfil>`

## 3) Deploy base
1. Levantar infra de soporte necesaria.
2. Levantar servicios core.
3. Normalizar permisos de volúmenes bind para servicios Node (obligatorio en host nuevo o ruta nueva).
4. Verificar salud de contenedores y logs iniciales.
5. Ejecutar smoke básico funcional.
6. Smoke operativo:
   - `./scripts/smoke-core.sh <perfil>`

### 3.1) Permisos persistentes (`uploads`/`config`)
Objetivo: evitar errores `EACCES` al subir archivos (`api_backend_nest`) al migrar entre hosts/rutas físicas/lógicas.

Ejecutar en el host, desde la raíz del repo:

```bash
cd /home/<usuario>/agora-platform/agora
sudo mkdir -p uploads config
sudo chown -R 1000:1000 uploads config
sudo find uploads config -type d -exec chmod 775 {} \;
sudo find uploads config -type f -exec chmod 664 {} \;
```

Validar dentro del contenedor:

```bash
docker exec -it api_backend_nest sh -lc 'id && ls -ld /app/uploads /app/config && touch /app/uploads/.perm_check && ls -l /app/uploads/.perm_check'
```

Si falla, recrear solo el servicio:

```bash
docker compose --env-file env/<perfil>.secrets.env -p stack_agora -f agora/docker-compose.yml up -d --force-recreate api_backend_nest
```

## 4) Rollback
1. Detener servicios impactados.
2. Restaurar versión previa de compose/env.
3. Levantar versión anterior.
4. Verificar health y flujos críticos.

## 5) Backup/restore validación
1. Verificar que backups existen y son recientes.
2. Restaurar en entorno de prueba (VPS2).
3. Ejecutar smoke contra datos restaurados.
4. Documentar resultado y timestamp.

## 6) Vault (estado actual)
- VPS1 en `npm_network` y accesible como `http://vault:8200` desde contenedores de la red.
- Auto-unseal cross-VPS queda para fase final.
