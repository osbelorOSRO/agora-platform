# DOC-BLUEPRINT-MONOREPO

## 1. Identidad del Proyecto
- Nombre oficial del monorepo: `agora-platform`
- Nota: `llevatuplan.cl` y `tigo-movil.cl` son dominios de entorno, no nombre de proyecto.

## 2. Estructura Objetivo (Opción A)
Se adopta estructura por dominio funcional para evitar mezcla:

```text
agora-platform/
  apps/
    frontend/
  services/
    api-backend-nest/
    abackend/
    websocket/
    wa-backend/
    fastapi-microservicio/
  infra/
    edge/
      nmp/
    messaging/
      n8n/
    ai/
      whisper/
      tesseract/
    cache/
      redis/
    security/
      vault/
    admin/
      pgadmin/
  ops/
    scripts/
    docs/
  env/
```

Regla de frontera:
- `apps/`: interfaces de usuario
- `services/`: lógica de negocio core
- `infra/`: servicios de soporte operacional/técnico
- `ops/`: operación, runbooks, scripts de despliegue/verificación
- `env/`: perfiles declarativos por entorno físico+lógico

## 3. Core Product Definido
Servicios core del producto:
- `frontend`
- `abackend`
- `websocket`
- `api-backend-nest`
- `wa-backend`
- `fastapi-microservicio`

## 4. Infra Declarativa en Repo
Se mantiene declarativa en repo (compose/config), no estado persistente:
- `n8n`
- `pgadmin`
- `tesseract`
- `whisper`
- `nmp`
- `redis`

Nota operativa actual:
- `vault` en produccion/dev real se opera fuera de repo (`/root/vault`).
- En repo solo puede existir referencia documental o template no operativo.

## 5. Política de Estado Persistente
Todo estado persistente o sensible va fuera del repo.

Ejemplos fuera del repo:
- `n8n-data`
- `nmp/data`
- `nmp/letsencrypt`
- `uploads`
- `auth`
- backups/dumps
- volúmenes de BD

Principio:
- Repo = configuración declarativa versionada
- Host/VPS = estado operativo mutable

## 6. NPM (Nginx Proxy Manager)
Decisión oficial:
- NPM forma parte del stack de `infra` (sí dentro del monorepo a nivel declarativo)
- Su estado queda fuera del repo (`/data`, `/etc/letsencrypt`, certs)

Esto aplica también a certificados de Cloudflare Origin: material sensible/operativo fuera de Git.

## 7. Bases de Datos: Arquitectura Operativa
### 7.1 Regla General
El monorepo **no depende** de que Postgres/Mongo estén dentro del mismo repo ni en el mismo compose del producto.

Las apps consumen BD por DSN/URL (`DATABASE_URL`, `MONGODB_URI`) como servicios externos.

### 7.2 Mapa físico/lógico definido
- Producción oficial BD: `VPS1` (permanente)
- Pruebas BD: copia restaurada en `VPS2` (solo dev/pruebas)
- Compose de BD fuera de `/proyectos`, gestionado en `/root` de cada VPS

### 7.3 Conectividad de seguridad
- Acceso a BD por red privada Tailscale (no por dominio público)
- Recomendación operativa: puertos de BD sin exposición a Internet pública

## 8. Ambientes físicos y lógicos
Perfiles activos definidos:
- `dev.local1` (`100.121.39.83`)
- `dev.vps1` (`100.67.8.81`)
- `dev.vps2` (`100.101.61.94`)
- `prod.vps1` (`100.67.8.81`, dominio `llevatuplan.cl`)
- `prod.vps2` (`100.101.61.94`, dominio `tigo-movil.cl`)

## 9. Convención de configuración
- Variables públicas por perfil: `*_PUBLIC_URL`
- Variables internas de red Docker: `*_INTERNAL_URL`
- Bind de puertos públicos por entorno: `HOST_BIND_IP`

## 10. Criterio de No Mezcla
Para evitar enredo operativo:
- No guardar datos persistentes en repo
- No mezclar estado de NPM/certs entre entornos
- No acoplar compose de aplicación al ciclo de vida de BD
- Operar BD como capa externa controlada

## 11. Estado de Aprobación
Este blueprint consolida decisiones aprobadas en sesión y sirve como base para:
- `DOC-MIGRACION-FASES.md`
- `DOC-GIT-RELEASE-GOVERNANCE.md`
- `DOC-VALIDACIONES.md`
- `DOC-GO-NO-GO.md`

## 12. Política Operativa de Vault (Acordada)
Modelo definido para esta etapa:
- `Vault VPS2`: unseal manual (ancla operativa)
- `Vault VPS1`: auto-unseal vía transit apuntando a `Vault VPS2`

Reglas operativas:
- No se asume reinicio conjunto de ambos VPS.
- Antes de reiniciar `Vault VPS1`, verificar `Vault VPS2` en estado `unsealed`.
- Si `Vault VPS2` cae, `Vault VPS1` sigue operativo mientras no reinicie.
- Mantener procedimiento de contingencia manual (claves Shamir resguardadas).
