# Release Checklist

Usar este checklist para cada release. Reemplazar `<X.Y.Z>` con la versión real.

## 1) Pre-flight (local)

- Rama `main` al día con todos los cambios del release.
- `git status` limpio (sin cambios sin commitear).
- Actualizar versión y fecha en `README.md` y `README-OPERACION.md`.
- Agregar entrada en `CHANGELOG.md` con los cambios del release.

## 2) Commit y push de release

```bash
git add README.md README-OPERACION.md CHANGELOG.md
git commit -m "release: <X.Y.Z> <descripción breve>"
git push origin main
```

## 3) Deploy en el host destino

```bash
cd <repo_root>
git pull origin main
./scripts/verify-env.sh <perfil>
./scripts/verify-compose.sh <perfil>
./scripts/up-profile.sh <perfil>
```

Rebuild de servicios que cambiaron (si aplica):

```bash
docker compose -p <stack> --env-file app/env/<perfil>.secrets.env \
  -f app/agora/docker-compose.yml up -d --build --force-recreate <servicio>
```

## 4) Smoke operativo

```bash
./scripts/smoke-core.sh <perfil>
```

Verificar flujos críticos manualmente según los cambios del release.

## 5) Validación de logs

```bash
docker logs --tail 100 <contenedor>
```

Confirmar que no hay errores de arranque ni excepciones no esperadas.

## 6) Tag

```bash
git tag v<X.Y.Z>
git push origin v<X.Y.Z>
```

El tag marca el estado exacto del repo que está corriendo en producción.
