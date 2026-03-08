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
3. Verificar salud de contenedores y logs iniciales.
4. Ejecutar smoke básico funcional.
5. Smoke operativo:
   - `./scripts/smoke-core.sh <perfil>`

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
