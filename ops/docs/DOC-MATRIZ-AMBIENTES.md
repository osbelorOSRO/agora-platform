# DOC-MATRIZ-AMBIENTES

## Ambientes definidos

| Perfil | Host físico | IP Tailscale | Modo | Dominio principal |
|---|---|---|---|---|
| dev.local1 | Local1 | 100.121.39.83 | Dev | zaldio.qzz.io |
| dev.vps1 | VPS1 | 100.67.8.81 | Dev | zaldio.qzz.io |
| dev.vps2 | VPS2 | 100.101.61.94 | Dev | zaldio.qzz.io |
| prod.vps1 | VPS1 | 100.67.8.81 | Prod | llevatuplan.cl |
| prod.vps2 | VPS2 | 100.101.61.94 | Prod | tigo-movil.cl |

## Política DB por perfil (actual)

| Perfil | Postgres | Mongo |
|---|---|---|
| dev.local1 | 100.101.61.94:5432 | 100.101.61.94:27017 |
| dev.vps1 | 100.101.61.94:5432 | 100.101.61.94:27017 |
| dev.vps2 | 100.101.61.94:5432 | 100.101.61.94:27017 |
| prod.vps1 | 100.67.8.81:5432 | 100.67.8.81:27017 |
| prod.vps2 | 100.67.8.81:5432 | 100.67.8.81:27017 |

## Reglas de uso de host en URI
- Contenedor -> contenedor en misma red Docker: usar nombre de servicio (`mongo`, `postgres_n8n`).
- Host/otro VPS -> BD remota: usar IP Tailscale.

## Formatos canónicos
- Postgres: `postgresql://USER:PASS@HOST:5432/DB?schema=public`
- Mongo: `mongodb://USER:PASS@HOST:27017/?authSource=admin`
