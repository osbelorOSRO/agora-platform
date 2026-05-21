# Changelog

## 1.7.1

### Fixed
- Welcome: eliminado `useWaDashboard` del componente raíz — su ciclo de socket (múltiples `setState` por evento + reconexiones móviles) causaba re-renders continuos que se manifestaban como artefactos visuales de tipo "ghost frame" en las tarjetas de módulos en móvil.
- Welcome: lógica de notificaciones de actividad extraída a componente aislado `WaActivitySection` para que sus re-renders no propaguen al árbol padre.
- Welcome: eliminado badge "ACTIVO" de tarjetas de módulo (no aportaba información y participaba en el ciclo de re-render).
- Welcome: corregido import faltante de `Users` que causaba pantalla en blanco al cargar.

## 1.7.0

### Changed
- Sistema de estilos del frontend migrado completamente a design tokens CSS (`globals.css` + `tailwind.config.ts`): eliminados `estilos.ts`, `theme.ts`, `theme.css` y `tailwind.config.js`. Todos los componentes usan variables `--primary`, `--background`, `--card`, `--border`, `--foreground`, `--muted-foreground` y utilidades Tailwind estándar.
- `MetaInboxPage` reescrito sin dependencias del sistema de estilos antiguo: layout inmersivo sin márgenes, compositor de chat fijo al fondo, navegación WhatsApp en móvil (lista de hilos → seleccionar → sólo chat; X para volver).
- Sidebar (`SidebarCompacto`) responsivo: 56 px con sólo iconos en móvil, 256 px con etiquetas en escritorio.
- `BaseLayout`: corrección de superposición del header fijo sobre el contenido en escritorio — se reemplazó el shorthand `p-*` por `px-*`/`pb-*` para evitar que la variante `md:` de Tailwind sobreescriba el `pt-[88px]`.
- Página Welcome responsiva: grid de stats 3 columnas siempre, cards de módulo 2 cols móvil / 5 cols escritorio, gráfica de barras adaptada, tarjeta de permisos sin overflow.
- Login: layout CSS grid 50/50 (animación centrada en mitad izquierda, tarjeta en mitad derecha), hover del botón primario corregido (ya no vira a gris), links de recuperación legibles con contraste correcto.
- `ResetPassword` y `Setup2FA`: mismo fix de hover en botón primario.

## 1.6.2

### Fixed
- `handlePageEcho` ahora extrae correctamente el `recipientId` desde `payload.recipientId` (campo plano del mensaje normalizado) en lugar de `payload.recipient.id` que no existe en la estructura interna — corrige el `page_echo skip no_recipient` que bloqueaba todos los echoes.
- Delivery events ya no usan `delivery.mids[0]` como `externalEventId` — evita la colisión de jobId con el `message_echo` del mismo mensaje en BullMQ, que causaba que el echo de Messenger externo fuera descartado silenciosamente antes de procesarse.

## 1.6.1

### Fixed
- `message_echo` enviados desde la app de Messenger directamente (no desde el sistema) ahora se persisten como mensajes salientes en el thread correcto del cliente, usando `recipient.id` para hacer match con el `session_id` existente (cualquier estado). Si no existe thread para el destinatario, se ignora sin efectos secundarios. Echoes del propio sistema siguen siendo descartados por `ON CONFLICT (external_event_id) DO NOTHING`.

## 1.6.0

### Added
- Módulo `meta-config` en `api-backend-nest`: configuración de credenciales Meta/Facebook Developer desde el panel superadmin, sin depender de Vault ni reinicio de contenedor.
- Tabla `meta_app_config` en Postgres: singleton con 13 campos, campos sensibles cifrados con AES-256-GCM (`app_secret`, `meta_page_access_token`, `meta_ig_access_token`, `admin_access_token`).
- Cache Redis (TTL 5 min) para las 5 claves Meta operativas — `getRuntimeSecret` las resuelve desde DB/Redis, nunca desde Vault.
- Endpoint `GET /meta-config` y `PATCH /meta-config` protegidos con `SuperadminJwtGuard`.
- Endpoint `GET /meta-config/reveal/:field` para descifrar campos sensibles bajo demanda, sin exponer valores en el GET general.
- Página `MetaConfigPage` en el panel frontend: navbar interno con tabs Basic, Messenger, Instagram y Configuración API Graph. Replica visual del portal de Facebook Developers con campos enmascarados, ojito para revelar valores (llamada al endpoint reveal) y edición inline.
- Ruta `/integraciones` protegida con `requiredRole=superadmin` y acceso desde sidebar.

## 1.5.0

### Added
- Módulo `stage-templates` en `api-backend-nest`: CRUD completo (`GET`, `POST`, `PATCH`, `DELETE`) sobre la tabla `stage_templates`, restringido a rol `superadmin` mediante nuevo guard `SuperadminJwtGuard`.
- Módulo `offers` en `api-backend-nest`: CRUD completo sobre la tabla `precios_planes`, restringido a superadmin. Incluye validación de `tipo` (`individual`, `multilineas`, `adicional`) y detección de código duplicado en create.
- `SuperadminJwtGuard` en `auth/`: guard independiente que valida JWT de panel y exige `rol === 'superadmin'`, retorna 403 si no cumple.
- Página `StageTemplatesPage` en el panel frontend: tabla completa de `stage_templates` con todas las columnas, filtro por `stage_actual`, scroll horizontal/vertical, badges coloreados por `accion` y `decision`, modal de create/edit, y acceso exclusivo a superadmin.
- Página `OffersPage` en el panel frontend: tabla completa de `precios_planes` con miniatura de imagen derivada de `url_archivo`, lightbox al doble click, badges por `tipo`, precios formateados en CLP, modal de create/edit, y acceso exclusivo a superadmin.
- `ProtectedRoute` extendido con prop `requiredRole` para restringir rutas por rol además de permisos.
- Rutas `/stage-templates` y `/offers` en el router, con ítems en sidebar visibles solo para superadmin.

### Changed
- `MetaInboxThread` y `MetaInboxContactUpdate` ahora incluyen `firstName`, `lastName`, `rut`, `address` y `region` — campos que ya existían en la tabla pero no se exponían en el panel ni en el endpoint de actualización de contacto.
- `getThreadRow` en `meta-inbox.service.ts` actualizado para hacer SELECT de los nuevos campos de contacto.
- Panel de contacto en `MetaInboxPage` actualizado con inputs para todos los campos del contacto.
- Baileys actualizado de `7.0.0-rc10` a `7.0.0-rc11`: `libsignal` migra de dependencia git a NPM (`^6.0.0`), `whatsapp-rust-bridge` sube a `0.5.4`, fix para VPS sin soporte SIMD en WASM.
- Workflows de N8N actualizados: `Meta_Signal_Clasifier`, `SWF_Precheck`, `SWF_RAG_Orchestrator`.

### Fixed
- Campo `accion` corregido de `delegar` a `enviar` en `stage_templates` para las rutas `requisitos_rut_factible → requisitos_oferta_alta` (id 39) y `requisitos_lineas_factibles → requisitos_acepta_porta` (id 66), en ambos entornos (local y remoto).

## 1.4.1

### Changed
- Repositorio reorganizado en dos grupos independientes: `app/` (agora, accesos, wa-backend, env) y `n8n/` (n8n, whisper, tesseract, env).
- N8N ahora es completamente autónomo: su env incluye `HOST_BIND_IP`, `N8N_DATA_TYPE` y `N8N_DATA_VOLUME`; no depende del env global de app.
- Whisper y Tesseract movidos a `n8n/whisper/` y `n8n/tesseract/` — reflejan que son exclusivos de n8n.
- Redis, Nginx Proxy Manager y PgAdmin removidos del repo; operan con compose propio en el host.
- Scripts actualizados para reflejar nuevas rutas de compose y env.

## 1.4.0

### Changed
- Migración del sistema de almacenamiento de archivos multimedia (imágenes, audio, video, documentos) de disco local a un gestor de objetos S3-compatible.
- Los archivos subidos por usuarios y los generados internamente (conversiones de audio, medios salientes) ahora se almacenan y sirven desde el nuevo gestor de media, con acceso HTTPS público.
- El backend ya no sirve archivos estáticos directamente — la responsabilidad de entrega de media queda en el gestor de objetos.
- Variables de entorno actualizadas para reflejar el nuevo origen de media en CSP y configuración del cliente S3.
- Validación de URLs de media actualizada para aceptar el nuevo esquema de rutas.

## 1.3.7

### Fixed
- Inicializacion de RedisStore en rate limiter: eliminado `lazyConnect` y `enableOfflineQueue:false` para evitar error de timing al arrancar el contenedor. ioredis ahora conecta automaticamente y encola los comandos hasta estar listo.

## 1.3.6

### Fixed
- `trust proxy` habilitado en abackend para leer `X-Forwarded-For` correctamente detras de Nginx Proxy Manager — el rate limiter ahora identifica la IP real del cliente.
- Actualizacion de rol de usuario ahora acepta `rol: {id, nombre}` ademas de `rolId` plano — el cambio de rol desde el panel quedaba silenciosamente ignorado.

## 1.3.5

### Added
- Rate limiting con Redis en abackend para endpoints publicos de autenticacion.
- Login: 10 requests por 15 minutos por IP.
- Registro, reset de contrasena y setup 2FA: 5 requests por hora por IP.
- Fail-open automatico si Redis no esta disponible para no bloquear el servicio.

## 1.3.4

### Added
- Sistema completo de gestion de credenciales administrado por SuperAdmin: tokens de invitacion, reset de contrasena y reset de 2FA de un solo uso (bcrypt hash en BD, plain devuelto una sola vez).
- Lockout automatico por intentos fallidos de login (5 intentos → cuenta bloqueada, desbloqueo solo por admin).
- Soft delete de preregistros: campo `cancelado` en tabla `usuarios` — el registro queda en BD pero es invisible en el panel y no puede hacer login.
- Campo `protegido` en tabla `usuarios`: usuario marcado como protegido es intocable por cualquier accion admin.
- Guardas de auto-proteccion: ningun admin puede ejecutar acciones de credenciales sobre su propia cuenta activa.
- Flujos publicos de recuperacion sin autenticacion: `/reset-password` y `/setup-2fa` (inicio, QR, confirmacion TOTP).
- Estado calculado de usuario: `activo`, `preregistrado`, `invitacion_expirada`, `sin_invitacion`, `bloqueado`, `reset_contraseña`, `reset_2fa`.

### Changed
- Login ya no revela si el username existe (`"Credenciales incorrectas"` en todos los casos de fallo de identidad).
- Formulario de registro ahora exige codigo de invitacion como primer campo.
- Pantalla de login incluye links directos a recuperacion de contrasena y configuracion de autenticador.

### Fixed
- Cancelar preregistro ya no falla con FK constraint al existir sesiones asociadas al usuario (soft delete en lugar de hard delete).
- Username duplicado (incluso de usuario cancelado) devuelve 409 con mensaje amigable en lugar de crash interno.

## 1.3.3

### Fixed
- Endurecimiento de validacion de entrada en `api-backend-nest` y `abackend`.

## 1.3.2

### Fixed
- Incorporacion de seguridad y boton stop global.

## 1.3.1

### Added
- Documento de plan de mitigacion de superficies de ataque con alcance estricto al repo.
- Guia de configuracion publica del README enfocada en templates y despliegue por entorno.

### Changed
- Templates `env/*.env` y `n8n/env/*.env` sanados para usar placeholders.
- Docs operativos limpiados de valores reales de entorno.

### Fixed
- Banner de version del README alineado con la release actual.

## 1.2.1

### Added
- Indicadores de estado de socket en `WA Control` (`connecting/reconnecting`, intento y último sync).
- Métrica de sesión activa WA: duración desde `connection=open` (no desde inicio del bot).
- Botón de gestión en `Welcome` para marcar notificaciones como leídas y limpiar las de APP.
- Checklist operativo de release/deploy para VPS1.

### Changed
- Notificaciones de `Welcome` agrupadas por `clienteId` para reducir ruido.
- Tarjeta de notificaciones muestra contador de no leídas consistente.

### Fixed
- Robustez de reconexión en `wa-control` evitando estados ambiguos al navegar entre módulos.
- Limpieza automática (TTL) de notificaciones persistidas en frontend.

## 1.2.0

### Added
- Dashboard transversal `Welcome` con métricas reales, gráficos y panel de notificaciones.
- Módulo `WA Control` integrado dentro de la app con acciones de bot, QR y actividad.
- Página `Agenda` para buscar, crear y eliminar contactos.
- Notificaciones persistentes en frontend y acciones rápidas desde `Welcome`.

### Changed
- Layout unificado con sidebar fija y header global para todos los módulos.
- Integración nativa de `Meta Inbox` y ajustes visuales en `Chats`.
- Búsqueda en `Chats` basada en clientes lite con apertura directa de conversación.
- SidePanels y tarjetas (cliente, cierre, scraping) unificadas en estilo visual.

### Fixed
- Consistencia tipográfica en `Usuarios` y `Roles`.
- Corrección de scroll y layout en vistas inmersivas (`Chats`, `Meta`).
- Reconexión de notificaciones desde el contexto global.
