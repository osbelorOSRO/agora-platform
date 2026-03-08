#!/bin/bash
set -e

echo "Iniciando restauración de Mongo..."

mongorestore \
  --username "${MONGO_INITDB_ROOT_USERNAME:-adminbot}" \
  --password "${MONGO_INITDB_ROOT_PASSWORD:?MONGO_INITDB_ROOT_PASSWORD no definido}" \
  --authenticationDatabase admin \
  --drop \
  /docker-entrypoint-initdb.d/dump

echo "Restauración completada."
