# Agora Platform

Monorepo operativo para una plataforma modular de atencion, automatizacion y control de conversaciones. Integra panel web, backend transaccional, autenticacion, WebSocket en tiempo real, WhatsApp, Meta Inbox, n8n y servicios auxiliares de IA/OCR.

## Vista del panel

![WA Control dashboard](docs/assets/wa-control.png)

## Version
- Actual: `v1.3.7`
- Fecha: `2026-05-10`

La evolución de cambios se documenta en `CHANGELOG.md`.

## Que incluye
- `agora/frontend`: consola React para vistas, threads unificados de Facebook, Instagram y WhatsApp, Agenda, Reportes, Ajustes, WA Control y notificaciones.
- `agora/api-backend-nest`: backend NestJS que orquesta eventos de `threads` y recursos de mensajeria instantanea de Meta, WebSocket y Baileys; incluye sesion, media, respuestas rapidas, webhooks, callbacks de actor y soporte conversacional.
- `agora/websocket`: gateway Socket.IO para eventos de aplicacion, estado del bot y actualizaciones en tiempo real.
- `wa-backend`: backend WhatsApp/Baileys para sesion, QR y recepcion/envio de mensajes; actua como conector operativo de WhatsApp sin orquestar automatizaciones.
- `accesos/abackend`: servicio de autenticacion, usuarios, roles, permisos y reportes administrativos.
- `n8n`: capa declarativa para flujos de automatizacion.
- `mongo`, `redis`, `whisper`, `tesseract`, `pgadmin` y `ops`: servicios y utilidades de soporte operativo.

## Configuracion publica
Este repositorio publica solo el codigo y templates de configuracion.

- Los archivos `env/*.env` y `n8n/env/*.env` son templates con placeholders.
- Cada despliegue completa su propia capa de configuracion segun el entorno.
- Los datos persistentes como `uploads`, sesiones WhatsApp, dumps, certificados y volumenes de BD quedan fuera del arbol versionado.

## Operacion rapida
1. Copiar el template del perfil que corresponda:

```bash
cp env/dev.local1.env env/dev.local1.secrets.env
cp n8n/env/dev.local1.env n8n/env/dev.local1.secrets.env
```

2. Completar los placeholders con los valores del entorno local.

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
