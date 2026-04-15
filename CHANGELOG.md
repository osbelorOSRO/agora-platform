# Changelog

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
