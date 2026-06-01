# Continuación — Módulo Social Postings

**Estado al corte:** 2026-05-29 — módulo funcional al 90%, quedan 2 pendientes técnicos + el flujo N8N.

---

## Lo que ya está hecho ✅

### Backend
- Migración aplicada: tablas `galeria_imagenes_ofertas`, `posteos_programados`, columna `fanpage_id` en `meta_app_config`
- Módulo `src/social-postings/` completo: CRUD panel + 2 endpoints N8N
- Upload múltiple de imágenes en `POST /media/galeria-ofertas` → bucket MinIO `ofertas`
- `GET /media/galeria-ofertas` y `DELETE /media/galeria-ofertas/:id`
- Token Meta Graph se **desencripta** en `getPendientesHoy` via `MetaConfigService.getSecret()`
- Feature flag `socialPostings: permisos.includes('gestion_integraciones')` en JWT

### Frontend
- Módulo `src/modules/socialPostings/` completo: hooks, servicios, tipos
- Componentes: `CalendarioMes`, `CalendarioSemana`, `CalendarioDia`, `DayCard`, `TareaForm`, `GaleriaImagenes`
- `SocialPostingsPage.tsx` con navegación mes/semana/día + botón Hoy
- Ruta `/social-postings` protegida con `requiredFeature="socialPostings"`
- Ícono `CalendarDays` en `SidebarCompacto`

### Infra
- Bucket MinIO `ofertas` creado con política de lectura pública
- VPS2 (MinIO) con firewalld: solo HTTP/HTTPS al mundo + SSH desde Tailscale

---

## Pendiente 🔴

### 1. Campo `fanpage_id` en MetaConfigPage

**Qué falta:**

A) **Backend** — agregar `fanpage_id` al DTO de actualización:

Archivo: `src/meta-config/dto/update-meta-config.dto.ts`
```ts
@IsOptional()
@IsString()
fanpage_id?: string;
```

B) **Frontend** — agregar el campo en `src/pages/MetaConfigPage.tsx`.
Buscar el array de campos del formulario (hay un `ConfigField` o similar) y agregar:
```tsx
{ key: 'fanpage_id', label: 'Fanpage ID', hint: 'ID numérico de la Fan Page (ej: 123456789)' }
```

Sin esto, `fanpage_id` siempre llega `null` al endpoint N8N.

---

### 2. Endpoint callback — verificar funcionamiento

```bash
curl -X PATCH "http://<HOST_BIND_IP>:4001/social-postings/n8n/1/resultado" \
  -H "Authorization: Bearer <N8N_SECRET_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"estado":"publicado","id_post":"123456789_987654321","raw":{"success":true}}'
```

Debe devolver 200 con el registro actualizado. Si falla, revisar `social-postings.service.ts → registrarResultado()`.

---

### 3. Flujo N8N

**Variables a configurar en N8N (dev y prod):**

| Variable | Valor dev | Descripción |
|---|---|---|
| `N8N_CUSTOM_API_TASK` | `https://<API_PUBLIC_HOST>/social-postings/n8n/pendientes-hoy` | GET tareas del día |
| `N8N_CUSTOM_CALLBACK_TASK` | `https://<API_PUBLIC_HOST>/social-postings/n8n` | Base PATCH resultado |
| `N8N_CUSTOM_API_POSTING` | `https://graph.facebook.com/v25.0` | Base Graph API |

**Lógica del flujo (Schedule 11 PM):**

```
[Cron 0 23 * * *]
  ↓
[HTTP GET] {{N8N_CUSTOM_API_TASK}}
  Header: Authorization: Bearer {{N8N_SECRET_TOKEN}}
  → { token, fanpage_id, tareas: [{id, caption, url_imagen}] }
  ↓
[IF] tareas.length === 0 → terminar
  ↓
[Loop sobre tareas]
  ↓
  [HTTP POST] {{N8N_CUSTOM_API_POSTING}}/{{fanpage_id}}/photos
    -d "url={{tarea.url_imagen}}"
    -d "caption={{tarea.caption}}"
    -d "published=true"
    Header: Authorization: Bearer {{token}}  ← token desencriptado que vino del backend
  ↓
  [IF éxito]
    [HTTP PATCH] {{N8N_CUSTOM_CALLBACK_TASK}}/{{tarea.id}}/resultado
      Body: { "estado": "publicado", "id_post": "{{id_post_de_graph}}", "raw": {{respuesta_graph}} }
      Header: Authorization: Bearer {{N8N_SECRET_TOKEN}}
  [IF error]
    [HTTP PATCH] {{N8N_CUSTOM_CALLBACK_TASK}}/{{tarea.id}}/resultado
      Body: { "estado": "error", "raw": {{error_graph}} }
      Header: Authorization: Bearer {{N8N_SECRET_TOKEN}}
```

**Importante:** el `id_post` que devuelve Graph API está en `response.data.id` (formato `"pageId_postId"`).

---

## Endpoints disponibles (referencia rápida)

| Método | Ruta | Guard | Descripción |
|---|---|---|---|
| GET | `/social-postings/calendario?mes=YYYY-MM` | Panel JWT | Tareas del mes |
| POST | `/social-postings` | Panel JWT | Crear tarea |
| PATCH | `/social-postings/:id` | Panel JWT | Editar tarea |
| DELETE | `/social-postings/:id` | Panel JWT | Soft delete |
| GET | `/social-postings/n8n/pendientes-hoy` | N8N token | Tareas + token Meta desencriptado |
| PATCH | `/social-postings/n8n/:id/resultado` | N8N token | Actualizar estado tras posteo |
| GET | `/media/galeria-ofertas` | Panel JWT | Listar galería |
| POST | `/media/galeria-ofertas` | Panel JWT | Subir imágenes (multipart, max 10) |
| DELETE | `/media/galeria-ofertas/:id` | Panel JWT | Soft delete imagen |

**N8N token:** ver `N8N_SECRET_TOKEN` en `<perfil>.secrets.env` (no versionado).

---

## Archivos clave del módulo

```
Backend:
  src/social-postings/
  src/media/media.controller.ts  (galería agregada aquí)
  src/media/media.service.ts
  src/media/media-security.ts    (galeriaOfertasMulterOptions)
  src/minio/minio.service.ts     (uploadFileToBucket)
  prisma/migrations/20260529000000_social_postings_and_gallery/

Frontend:
  src/modules/socialPostings/
  src/pages/SocialPostingsPage.tsx
  src/modules/accesos/components/SidebarCompacto.tsx (ícono CalendarDays)
  src/utils/getTokenData.ts (UserFeatures.socialPostings)
  src/App.tsx (ruta /social-postings)
```
