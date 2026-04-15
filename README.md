# Agora Platform

Monorepo operativo para una plataforma modular de atencion, automatizacion y control de conversaciones. Integra panel web, backend transaccional, autenticacion, WebSocket en tiempo real, WhatsApp, Meta Inbox, n8n y servicios auxiliares de IA/OCR.

## Version
- Actual: `v1.2.1`
- Fecha: `2026-04-15`

En cada release se debe actualizar esta seccion, mantener `CHANGELOG.md` al dia y crear un tag Git con formato `vX.Y.Z`.

## Que incluye
- `agora/frontend`: consola React para vistas, chats Kanban, Meta Inbox, Agenda, Reportes, Ajustes, WA Control y notificaciones.
- `agora/api-backend-nest`: API NestJS para clientes, procesos, mensajes, media, Meta, scraping y notificaciones hacia el panel.
- `agora/websocket`: gateway Socket.IO para eventos de aplicacion, estado del bot y actualizaciones en tiempo real.
- `wa-backend`: backend WhatsApp/Baileys para sesion, QR, recepcion/envio de mensajes y puente con automatizaciones.
- `accesos/abackend`: servicio de autenticacion, usuarios, roles, permisos y reportes administrativos.
- `n8n`: capa declarativa para flujos de automatizacion.
- `mongo`, `redis`, `whisper`, `tesseract`, `infraestructura` y `ops`: servicios y utilidades de soporte operativo.

## Configuracion publica
Este repositorio esta preparado para publicarse sin secretos reales.

- Los archivos `env/*.env` y `n8n/env/*.env` son templates con placeholders.
- Los valores reales deben vivir en archivos privados `*.secrets.env`, en `.env` locales por servicio o en Vault.
- Las IPs privadas, dominios reales, tokens, claves y passwords no deben commitearse.
- Los datos persistentes como `uploads`, sesiones WhatsApp, dumps, certificados y volumenes de BD deben quedar fuera de Git.

Si alguna clave real fue committeada alguna vez, no basta con borrarla del ultimo commit: hay que rotarla y evaluar limpieza de historial antes de hacer publico el repo.

## Operacion rapida
1. Copiar el template del perfil que corresponda:

```bash
cp env/dev.local1.env env/dev.local1.secrets.env
cp n8n/env/dev.local1.env n8n/env/dev.local1.secrets.env
```

2. Completar placeholders con valores reales del host, dominios, Vault, Redis y bases de datos.

3. Inicializar `.env` privados por servicio si faltan:

```bash
./scripts/init-service-envs.sh
```

4. Validar y levantar el perfil:

```bash
./scripts/verify-env.sh dev.local1
./scripts/verify-compose.sh dev.local1
./scripts/up-profile.sh dev.local1
```

## Documentacion
- `README-OPERACION.md`: guia principal de operacion por perfil.
- `CHANGELOG.md`: historial de releases.
- `ops/docs/`: runbooks, matriz de ambientes, validaciones y gobierno de release.

## Licencia
Pendiente de definir.
