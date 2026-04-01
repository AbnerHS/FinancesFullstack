#!/usr/bin/env bash

set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME:-mysql-db}"
MYSQL_DATABASE="${MYSQL_DATABASE:-finances}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:?Defina MYSQL_PASSWORD antes de executar o script.}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date +%F-%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/${MYSQL_DATABASE}-${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

docker exec "$CONTAINER_NAME" mysqldump \
  -u "$MYSQL_USER" \
  "-p${MYSQL_PASSWORD}" \
  --single-transaction \
  --routines \
  --triggers \
  "$MYSQL_DATABASE" > "$BACKUP_FILE"

echo "Backup criado em: $BACKUP_FILE"
