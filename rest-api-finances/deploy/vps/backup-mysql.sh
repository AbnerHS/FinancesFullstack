#!/usr/bin/env bash

set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME:-mysql-db}"

# Carrega .env se não foram passadas as variáveis como env
if [[ -f ".env" ]]; then
  # shellcheck source=/dev/null
  set -a; source .env; set +a
fi

SPRING_DATASOURCE_URL="${SPRING_DATASOURCE_URL:?Defina SPRING_DATASOURCE_URL no .env ou no ambiente.}"
DB_USERNAME="${DB_USERNAME:?Defina DB_USERNAME no .env ou no ambiente.}"
DB_PASSWORD="${DB_PASSWORD:?Defina DB_PASSWORD no .env ou no ambiente.}"

# Extrai o nome do banco do JDBC URL (jdbc:mysql://host:port/dbname?params)
MYSQL_DATABASE="${MYSQL_DATABASE:-$(echo "$SPRING_DATASOURCE_URL" | sed 's|.*\/||; s|\?.*||')}"
MYSQL_USER="${MYSQL_USER:-$DB_USERNAME}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-$DB_PASSWORD}"
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
