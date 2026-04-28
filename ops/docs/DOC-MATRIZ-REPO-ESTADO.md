# DOC-MATRIZ-REPO-ESTADO

Fecha de corte: 2026-03-08

## Regla oficial
- En repo: definicion declarativa (compose, templates, docs, scripts).
- Fuera del repo: estado persistente, secretos, certificados y datos operativos.

## Matriz por servicio

| Servicio | Compose en repo | Runtime recomendado | Estado persistente/secreto |
|---|---|---|---|
| `frontend` | Si | En stack app por perfil | Build cache fuera de git |
| `api-backend-nest` | Si | En stack app por perfil | uploads/logs fuera de git |
| `abackend` | Si | En stack app por perfil | logs fuera de git |
| `panel_websocket` | Si | En stack app por perfil | logs fuera de git |
| `wa-backend` | Si | En stack app por perfil | `auth`, sesiones, media fuera de git |
| `redis` | Si | En stack app por perfil | datos redis fuera de git si se persiste |
| `whisper` | Si | En stack app por perfil | stateless |
| `tesseract` | Si | En stack app por perfil | stateless |
| `n8n` | Si (template) | Preferente fuera de repo en prod | `n8n-data`, credenciales y llaves fuera de git |
| `nmp` | Si (template) | Preferente fuera de repo en prod | `/data`, `/letsencrypt`, certs Cloudflare fuera de git |
| `pgadmin` | Si (template) | Preferente fuera de repo en prod | db de pgadmin/sesiones fuera de git |
| `vault` | No (operativo) | Fuera de repo (`/root/vault`) | todo vault state/token/config sensible fuera de git |
| `postgres` | No (operativo) | Fuera de repo (`/root/bd`) | volumenes/datos/backups fuera de git |

## Decisiones cerradas
- BD oficiales operadas fuera de repo.
- Vault operativo fuera de repo.
- Monorepo no depende de BD embebidas en compose del producto.
- Conectividad de BD y Vault por Tailscale/red Docker segun entorno.
- El antiguo `fastapi_microservicio` de Mongo/RUT/procesos queda retirado del runtime conversacional.
