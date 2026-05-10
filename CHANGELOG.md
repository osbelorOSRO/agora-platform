# Changelog

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
