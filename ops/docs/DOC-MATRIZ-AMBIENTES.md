# DOC-MATRIZ-AMBIENTES

## Ambientes definidos

| Perfil | Host físico | IP Tailscale | Modo | Dominio principal |
|---|---|---|---|---|
| dev.local1 | Local1 | <host_bind_ip> | Dev | dev.example.local |
| dev.vps1 | VPS1 | <host_bind_ip> | Dev | dev.example.local |
| dev.vps2 | VPS2 | <host_bind_ip> | Dev | dev.example.local |
| prod.vps1 | VPS1 | <host_bind_ip> | Prod | example.com |
| prod.vps2 | VPS2 | <host_bind_ip> | Prod | example.org |

## Política DB por perfil (actual)

| Perfil | Postgres | Mongo |
|---|---|---|
| dev.local1 | <host_bind_ip>:5432 | <host_bind_ip>:27017 |
| dev.vps1 | <host_bind_ip>:5432 | <host_bind_ip>:27017 |
| dev.vps2 | <host_bind_ip>:5432 | <host_bind_ip>:27017 |
| prod.vps1 | <host_bind_ip>:5432 | <host_bind_ip>:27017 |
| prod.vps2 | <host_bind_ip>:5432 | <host_bind_ip>:27017 |

## Reglas de uso de host en URI
- Contenedor -> contenedor en misma red Docker: usar nombre de servicio (`mongo`, `postgres_n8n`).
- Host/otro VPS -> BD remota: usar IP Tailscale.

## Formatos canónicos
- Postgres: `postgresql://USER:PASS@HOST:5432/DB?schema=public`
- Mongo: `mongodb://USER:PASS@HOST:27017/?authSource=admin`
