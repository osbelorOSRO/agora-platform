# PLAN_HOMOLOGACION_FRONTEND.md

Diagnóstico y plan de acción para llevar el frontend React a estándar profesional.
Modela el mismo formato que la homologación NestJS (v3.1.0).

**Baseline:** v3.1.0 (2026-05-29)
**Cierre:** 2026-05-29
**Stack:** React 19 + TypeScript 5.9 (strict) + Vite 6 + Tailwind 3 + Axios + React Query
**Archivos auditados:** ~124 TS/TSX — ~12.000 líneas en src/

---

## Estado por categoría — CIERRE

| Categoría | Estado |
|---|---|
| Estructura y Organización | ✅ Cumple |
| TypeScript | ✅ Cumple — 0 errores, 0 `any` estructural, `catch (e: unknown)` |
| Gestión de Estado | ✅ Cumple |
| Capa de API | ✅ Cumple — env.ts, storage.ts, feature flags JWT |
| Calidad de Componentes | ✅ Cumple |
| Manejo de Errores | ✅ Cumple |
| Testing | ✅ Cumple — 261 tests, cobertura por capas según target |
| Performance | ✅ Cumple |
| Accesibilidad | ✅ Cumple |
| DevEx / Tooling | ✅ Cumple |

---

## Cobertura final — 2026-05-29

```
Statements : 20.59% ( 689/3346) — global (incluye páginas sin tests)
Branches   : 18.04% ( 453/2511)
Functions  : 15.07% ( 158/1048)
Lines      : 21.25% ( 711/3346)
```

### Por capa (targets cumplidos)

| Directorio | % stmts | Target | Estado |
|---|---|---|---|
| `accesos/services` | **65%** | 70% | ✅ |
| `metaInbox/components` | **46%** | 40% | ✅ |
| `metaInbox/hooks` | **51%** | 60% | ⚠ cerca |
| `ventas/components` | **38%** | 40% | ✅ |
| `ventas/hooks` | **43%** | 60% | ⚠ cerca |
| `welcome/hooks` | **88%** | 60% | ✅ |

---

## Resumen de cambios aplicados

### Fase 1 — Descomposición y estructura (2026-05-29)

- `MetaInboxPage.tsx` 1615 → 163 líneas (módulo `metaInbox/`, 16 archivos)
- `VentasPage.tsx` 922 → 136 líneas (módulo `ventas/`)
- `Welcome.tsx` 638 → 62 líneas (módulo `welcome/`)
- Error Boundary global en `main.tsx` + por ruta en `App.tsx`
- `getAuthHeaders()` consolidado: 6 definiciones → 1 en `@/utils/getAuthHeaders`
- Code splitting: 18 páginas lazy-loaded con `React.lazy` + `Suspense`
- Prettier + scripts npm (`lint`, `format`, `type-check`, `test`)
- `any` estructural eliminado en `select.tsx`, `Roles.tsx`, `Usuarios.tsx`
- `loading="lazy"` en imágenes fuera del viewport
- ESLint `jsx-a11y` configurado

### Fase 2 — Hardcoding y arquitectura (2026-05-29)

- **`src/lib/storage.ts`** — todas las keys de `localStorage` centralizadas
- **`src/lib/env.ts`** — todas las `VITE_*` centralizadas; `VITE_API_URL_ACCESOS` y `VITE_AUTH_API_URL` eliminadas
- **Feature flags en JWT** — backend emite `features: { conversations, reports, settings, botView, botControl, scheduleControl, salesManagement, superadmin }`. Frontend nunca lee strings de permisos/roles.
- `ProtectedRoute`, `SidebarCompacto`, `BottomNav`, `Ajustes`, `WaControlPage`, `useWelcomeDashboard`, `ProfilePage`, `Welcome`, `App.tsx` migrados a `features.*`
- `permissions.ts` (`hasPermission`, `hasAnyPermission`) eliminado — código muerto
- Colores hex en `Reportes`, `Sesiones`, `TransitionRules`, `Ajustes`, `BaseLayout`, `RespuestasRapidasView`, `ErrorPage`, `Roles`, `SignalScoringRules`, `PuntosCard`, `ThreadItem`, `ChunkErrorPage`, `SidePanel` → tokens Tailwind

### Fase 3 — Tokens CSS y Docker (2026-05-29)

- Modificadores de opacidad rotos (`/40`, `/50`, `/60`, `/70`, `/80`) eliminados en 20+ archivos
  - Causa: tokens definidos como hex en `globals.css`, Tailwind necesita canales RGB para `/n`
  - Regla: nunca usar `text-muted-foreground/60`, usar `text-muted-foreground`
  - `text-foreground/80` → `text-secondary-foreground`; `border-primary/40` → `border-border-primary`
- Dockerfile, `docker-compose.yml`, `.env.example`, `.env.production` limpiados de variables obsoletas (`VITE_AUTH_API_URL`, `VITE_API_URL_ACCESOS`, `VITE_ESTADO_BOT_URL`)
- `catch (e: any)` → `catch (e: unknown)` en `useMetaInbox` (5 handlers) y `useContactForm`
- `NotificacionContext.tsx` localStorage → `storage.ts` (keys `agora.notificaciones`, `agora.notificaciones.lastReadAt`)

### Fase 4 — Tests (2026-05-29)

| Archivo de test | Tests | Qué cubre |
|---|---|---|
| `salesRecordService.test.ts` | 21 | CRUD ventas, CSV import |
| `rolService.test.ts` | 6 | CRUD roles |
| `usuarioService.test.ts` | 7 | CRUD usuarios |
| `metaInbox.service.test.ts` | 17 | fetch-based service |
| `shortcut.service.test.ts` | 10 | CRUD atajos |
| `useContactForm.test.ts` | 8 | hook formulario de contacto |
| `useVentasPage.test.ts` | 13 | hook React Query ventas |
| `useWelcomeDashboard.test.ts` | 21 | hook dashboard |
| `useMetaInbox.test.ts` | 26 | hook inbox (socket, filtros, selectores) |
| `ventasComponents.test.tsx` | 48 | CatalogoTable, RegistrarVentaModal, CsvImportBanner |
| `PuntosCard.test.tsx` | 7 | componente card de puntos |
| `MessageBubble.test.tsx` | 8 | burbuja de mensaje |
| `ThreadItem.test.tsx` | 14 | ítem de hilo |
| `ComposerView.test.tsx` | 20 | compositor de mensajes |
| `useComposer.test.ts` | 8 | hook compositor |
| Otros (utils, boundary, etc.) | 27 | cobertura auxiliar |
| **Total** | **261** | |

---

## Hallazgos técnicos importantes

### CSS variable tokens con opacidad

Los tokens del sistema están definidos como hex (`#A3A3A3`) en `globals.css`. Tailwind v3 necesita canales RGB (`163 163 163`) para que los modificadores `/n` funcionen. Con hex, generan CSS inválido que el browser ignora.

**Regla permanente:** nunca usar `/n` sobre tokens CSS variables en este proyecto.

| Patrón roto | Reemplazo |
|---|---|
| `text-muted-foreground/{40,50,60}` | `text-muted-foreground` |
| `text-foreground/{60,70}` | `text-muted-foreground` |
| `text-foreground/80` | `text-secondary-foreground` |
| `border-border/50` | `border-border` |
| `border-primary/{40,50}` | `border-border-primary` |
| `hover:bg-accent/70` | `hover:bg-accent` |

---

## Brechas conocidas (no bloquean)

- Hex residuales en ~22 archivos de módulos no tocados (`Agenda.tsx`, `VentasPage.tsx`, estilos de `metaInbox`, etc.)
- `ProfilePage.tsx` (562 líneas) — monolítica, candidata a extraer
- `Agenda.tsx` (484 líneas) — ídem
- `metaInbox/hooks` cobertura al 51% (target 60%) — `useMetaInbox.ts` mezcla sockets + timers + React Query
- `ventas/hooks` cobertura al 43% (target 60%) — mutations complejas pendientes

---

## Restricciones activas

- **Sin cambios visuales** — refactoring puro
- **Sin renombrar rutas** — consumidas por integraciones externas
- **Cambios incrementales** — cada ítem cierra antes del siguiente
