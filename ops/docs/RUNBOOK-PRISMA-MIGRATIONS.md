# Runbook — Prisma Migrations en Prod

## Flujo normal (CI/CD automático)

Cada push a `main` que toca `app/agora/**` ejecuta el workflow `ci-cd-agora.yml` en este orden:

1. **Build** — construye la imagen nueva del backend
2. **Migrate** — corre `prisma migrate deploy` en un container temporal conectado a la red Docker interna
3. **Restart** — reemplaza los containers solo si migrate pasó

Si el paso de migración falla, el workflow se detiene y el backend actual sigue corriendo sin cambios.

---

## Intervención manual — cuándo y por qué

Solo es necesario intervenir manualmente si una migración quedó en estado `failed` en la tabla `_prisma_migrations`. Esto ocurre cuando el SQL de una migración empezó a ejecutarse y rompió a mitad (ej. constraint violation, tipo que ya existe, tabla que ya existe).

En ese estado, `prisma migrate deploy` se niega a continuar con error `P3009`.

---

## Comandos de recuperación

Todos los comandos se corren en el VPS desde cualquier directorio. Requieren que la imagen `stack_agora-backend` esté construida.

### 1 — Obtener DATABASE_URL

```bash
DB_URL=$(grep '^API_DATABASE_URL=' /home/deploy/agora-platform/app/env/prod.vps1.secrets.env | cut -d'=' -f2-)
```

### 2a — Marcar migración como aplicada (tabla ya existe en DB)

Usar cuando el error es que la tabla/tipo ya existía antes de que Prisma la gestionara.

```bash
docker run --rm \
  --network npm_network \
  -e DATABASE_URL="$DB_URL" \
  stack_agora-backend \
  sh -c "npx prisma migrate resolve --applied '<nombre_migracion>'"
```

Ejemplo: `npx prisma migrate resolve --applied '20260525000000_add_wa_ad_leads'`

### 2b — Marcar migración como revertida (SQL roto, migración no se aplicó)

Usar cuando el SQL falló y la migración no llegó a aplicarse. Después de esto hay que corregir el SQL y hacer push.

```bash
docker run --rm \
  --network npm_network \
  -e DATABASE_URL="$DB_URL" \
  stack_agora-backend \
  sh -c "npx prisma migrate resolve --rolled-back '<nombre_migracion>'"
```

### 3 — Reiniciar el backend después de resolver

```bash
cd /home/deploy/agora-platform
docker compose -p stack_agora \
  --env-file app/env/prod.vps1.secrets.env \
  -f app/agora/docker-compose.yml \
  restart backend
```

---

## Cómo consultar el estado de migraciones

```bash
docker run --rm \
  --network npm_network \
  -e DATABASE_URL="$DB_URL" \
  stack_agora-backend \
  sh -c "npx prisma migrate status"
```

---

## Por qué se usa `docker run` y no `npx` directo en el host

El host no tiene `node_modules`. El `prisma.config.ts` importa de `prisma/config` que solo existe dentro de la imagen del backend. Además, `postgres_n8n` solo es accesible desde la red Docker interna (`npm_network`), no desde el host.

---

## Baseline inicial (solo se hace una vez por DB nueva)

Si se configura Prisma Migrate en una DB que ya tenía tablas creadas con `db push` o SQL directo, hay que marcar el baseline como aplicado antes del primer deploy:

```bash
docker run --rm \
  --network npm_network \
  -e DATABASE_URL="$DB_URL" \
  stack_agora-backend \
  sh -c "npx prisma migrate resolve --applied '0_init'"
```

Esto le dice a Prisma que la DB ya tiene ese estado y no debe ejecutar ese SQL.
