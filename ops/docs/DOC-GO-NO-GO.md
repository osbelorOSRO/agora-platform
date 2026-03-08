# DOC-GO-NO-GO

## GO mínimo para avanzar a siguiente fase
- [ ] Perfiles `env/` completos y consistentes por ambiente.
- [ ] `docker compose config` pasa en stacks activos.
- [ ] Red `npm_network` existente en host objetivo.
- [ ] DB reachable según perfil (Postgres 5432, Mongo 27017).
- [ ] Vault reachable desde red Docker (`http://vault:8200`).
- [ ] Front/API/WebSocket/N8N levantan sin errores críticos en logs.

## NO-GO (bloqueantes)
- [ ] Variables críticas faltantes o hardcode no controlado.
- [ ] Inconsistencia de red (`npm_shared_net` vs `npm_network`).
- [ ] Contenedores sin health en estado estable.
- [ ] URLs de entorno cruzadas (prod apuntando a dev o viceversa).
- [ ] Backup no verificable o restore fallido.

## Pendientes explícitos (postergados al final)
- [CERRADO] Réplica operativa de BD en VPS2 siguiendo patrón VPS1.
- [CERRADO] Modelo final de Vault cross-VPS (VPS1 auto-unseal vía VPS2).

## Pendientes abiertos actuales
- Rotar tokens/keys expuestos en pruebas operativas.
- Formalizar matriz `repo vs estado` por servicio y ejecutar limpieza final de carpetas sensibles en repo.
