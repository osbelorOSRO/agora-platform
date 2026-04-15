# Release 1.2.1 Checklist (VPS1)

## 1) Pre-flight (local)
- `git status -sb` limpio o con cambios esperados.
- `npm -C agora/frontend run build`
- `npm -C wa-backend run build`

## 2) Publicar en `main`
```bash
cd /home/oscar/Documentos/GitHub/agora-platform
git add .
git commit -m "release: 1.2.1 realtime hardening and notifications consistency"
git push origin main
```

## 3) Actualizar VPS1
```bash
cd ~/agora-platform
git pull origin main
```

## 4) Rebuild de servicios impactados
```bash
docker compose -p stack_agora --env-file env/prod.vps1.env -f agora/docker-compose.yml up -d --build --force-recreate frontend wa_backend panel_websocket
```

## 5) Smoke tests rápidos
- Entrar a `/wa-control` sin F5:
  - Debe mostrar estado socket (`conectando/reconectando/activo`) y sincronizar solo.
  - Debe mostrar `Tiempo conectado` creciendo en vivo cuando `conexion=open`.
- Cerrar proceso en Kanban:
  - Cliente debe salir de activos sin F5.
- Mensaje entrante nuevo:
  - Debe aparecer en notificaciones `Welcome`.
  - Debe agruparse por cliente (contador por tarjeta APP).

## 6) Validación de logs
```bash
docker logs --tail 150 wa_backend
docker logs --tail 150 panel_websocket
docker logs --tail 150 frontend
```

## 7) Tag release
```bash
cd ~/agora-platform
git tag v1.2.1
git push origin v1.2.1
```
