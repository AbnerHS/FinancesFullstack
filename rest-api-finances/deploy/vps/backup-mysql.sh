#!/usr/bin/env bash

set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME:-mysql-db}"

# Carrega .env localizado na raiz do projeto (dois níveis acima deste script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../../.env"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  set -a; source "$ENV_FILE"; set +a
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
