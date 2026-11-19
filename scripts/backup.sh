#!/usr/bin/env bash
# NFREQ13: daily database backup with 14-day retention.
# Usage: DATABASE_URL=postgresql://... BACKUP_DIR=/var/backups/esports-hub scripts/backup.sh
# Schedule daily, e.g. cron:  15 3 * * *  cd /srv/esports-hub && scripts/backup.sh >> /var/log/esports-backup.log 2>&1
# Restore:  pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" <file>.dump
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
# pg_dump does not understand Prisma's ?schema= parameter.
URL="${DATABASE_URL%%\?*}"
FILE="$BACKUP_DIR/esports-hub-$(date -u +%Y%m%dT%H%M%SZ).dump"

pg_dump --format=custom --no-owner --file="$FILE.partial" "$URL"
mv "$FILE.partial" "$FILE"
echo "Backup written: $FILE ($(du -h "$FILE" | cut -f1))"

find "$BACKUP_DIR" -name 'esports-hub-*.dump' -type f -mtime +"$RETENTION_DAYS" -print -delete | sed 's/^/Deleted old backup: /'
