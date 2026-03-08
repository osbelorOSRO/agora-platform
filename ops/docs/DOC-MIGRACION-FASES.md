# DOC-MIGRACION-FASES

## Objetivo
Migrar desde el estado actual a `agora-platform` operable por perfiles, sin dependencia del repo para estado persistente, y con BD externas operadas por VPS.

## Alcance
- Incluye: configuración, compose, perfiles, operación, validación, documentación.
- Excluye: cambio de lógica de negocio de aplicaciones.

## Fase 0: Congelación y Baseline
### Objetivo
Tomar foto estable del estado actual antes de cualquier transición de operación.

### Entradas
- Stack actual funcionando en `local1`.
- Entornos definidos (`dev.local1`, `prod.vps1`, `prod.vps2`).

### Pasos
1. Congelar cambios funcionales (solo cambios infra/ops).
2. Exportar baseline:
   - `docker ps`
   - `docker compose config` por stack
   - listado de env activos por perfil
3. Respaldar estado persistente crítico:
   - `n8n-data`
   - `nmp/data`, `nmp/letsencrypt`
   - `uploads`, `auth`
   - dumps de BD (si aplica)

### Criterio de éxito
- Baseline documentado y backups verificados legibles.

### Punto de no-retorno
- Ninguno.

### Rollback
- No aplica (fase de preparación).

---

## Fase 1: Estandarización Declarativa en Repo
### Objetivo
Consolidar `env` por perfil y compose parametrizados sin hardcodes críticos.

### Pasos
1. Confirmar perfiles `env/*.env` y `n8n/env/*.env`.
2. Confirmar compose parametrizados por `HOST_BIND_IP` y URLs por perfil.
3. Confirmar separación temporal de compose:
   - `mongo` vs `microservicio`
   - `postgres` vs `pgadmin`
4. Verificar scripts operativos:
   - `scripts/up-profile.sh`
   - `scripts/down-profile.sh`
   - `scripts/status-profile.sh`

### Criterio de éxito
- `docker compose config` OK en todos los stacks relevantes.
- Levante de `dev.local1` exitoso con perfil.

### Punto de no-retorno
- Bajo: cambios reversibles en archivos de configuración.

### Rollback
- Restaurar versión previa de compose/env/scripts desde backup local o control de cambios.

---

## Fase 2: Desacople Operativo de Bases de Datos
### Objetivo
Formalizar que el producto consume BD externas por URL, sin depender del compose de app.

### Pasos
1. Definir `VPS1` como BD oficial (prod), fuera de `/proyectos` (`/root`).
2. Definir `VPS2` como BD de pruebas (restaurada desde backup), también fuera de `/proyectos`.
3. Ajustar `DATABASE_URL` y `MONGODB_URI` por perfil para apuntar a hosts de BD externos.
4. Asegurar conectividad por Tailscale para DB (sin exposición pública).

### Criterio de éxito
- Servicios core conectan a BD por URL externa en `prod.vps1` y `prod.vps2/dev`.
- Compose de app puede levantarse sin incluir compose de BD local.

### Punto de no-retorno
- Medio: cambio de origen de datos para entornos activos.

### Rollback
- Rehabilitar temporalmente stack de BD externo del host (`/root/...`) y restaurar URLs internas previas.

---

## Fase 3: Operación Multi-Host y Vault
### Objetivo
Asegurar operación reproducible en VPS/local y política de secretos definida.

### Pasos
1. Aplicar runbook de arranque/parada por perfil en cada host.
2. Consolidar política Vault:
   - `VPS2` unseal manual (ancla)
   - `VPS1` auto-unseal transit contra `VPS2`
3. Verificar no dependencia circular y procedimiento de contingencia (Shamir).
4. Verificar NPM:
   - declarativo en repo
   - estado fuera del repo

### Criterio de éxito
- Arranque/estado/detención funcionan por perfil en host objetivo.
- Vault operativo según política acordada.

### Punto de no-retorno
- Medio/alto: cambios en operación de secretos.

### Rollback
- Volver a unseal manual en ambos Vault temporalmente.
- Restaurar configuración Vault previa desde backup de configuración.

---

## Fase 4: Validaciones y Go/No-Go
### Objetivo
Validar técnicamente antes de declarar operación estable.

### Pasos
1. Ejecutar validaciones mínimas:
   - preflight infra
   - verify env
   - verify compose
   - smoke servicios core
2. Ejecutar smoke funcional crítico:
   - login frontend
   - WS conectado
   - media/upload
   - envío multimedia
   - flujo QR `wa-backend`
3. Completar semáforo `Go/No-Go`.

### Criterio de éxito
- Sin bloqueadores críticos abiertos.
- Go explícito aprobado.

### Punto de no-retorno
- Alto: publicación como estado operativo oficial.

### Rollback
- `down-profile` del entorno objetivo.
- restaurar env/compose y estado NPM anteriores.
- volver a baseline de fase 0.

---

## Matriz de Riesgos
1. Dependencia Vault transit (`VPS1` depende de `VPS2` para reinicio).
2. Error de perfil env (dominio/protocolo cruzado).
3. Estado persistente no restaurado (NPM/n8n/uploads/auth).
4. Conectividad Tailscale degradada para BD externas.

Mitigaciones:
- checklists pre-deploy obligatorios
- backups probados
- smoke tests por fase
- rollback documentado y ensayado

## Entregables de cierre de migración
- `DOC-ESTADO-ACTUAL.md`
- `DOC-BLUEPRINT-MONOREPO.md`
- `DOC-MIGRACION-FASES.md` (este documento)
- `DOC-GIT-RELEASE-GOVERNANCE.md`
- `DOC-VALIDACIONES.md`
- `DOC-GO-NO-GO.md`
