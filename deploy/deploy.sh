#!/usr/bin/env bash
# Deploys the latest master on the server: back up, pull, install, update the schema, build, restart.
# Run as root from the app folder:  sudo deploy/deploy.sh
# Stops at the first failure, so a failed build never gets restarted into.
#
# Server-specific settings live in deploy/deploy.local.env (gitignored), e.g.
#   SERVICE=myapp                            # systemd service to restart
#   DB_FILE=/path/to/database.db             # the SQLite file to back up
#   BACKUP_DIR=/path/to/backups              # where the pre-deploy database copy goes
#   HEALTH_URL=http://127.0.0.1:PORT/        # checked after the restart
set -euo pipefail

# Everything lives in main so bash reads the whole script before running it;
# the git pull below may replace this file mid-run.
main() {
  if [ "$(id -u)" -ne 0 ]; then
    echo "Run with sudo: sudo $0" >&2
    exit 1
  fi

  local app_dir config
  app_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
  config="$app_dir/deploy/deploy.local.env"
  if [ ! -f "$config" ]; then
    echo "Missing $config (needs SERVICE, DB_FILE, BACKUP_DIR and HEALTH_URL; see the top of this script)." >&2
    exit 1
  fi
  # shellcheck source=/dev/null
  . "$config"
  : "${SERVICE:?set SERVICE in $config}" "${DB_FILE:?set DB_FILE in $config}" "${BACKUP_DIR:?set BACKUP_DIR in $config}" "${HEALTH_URL:?set HEALTH_URL in $config}"

  cd "$app_dir"
  # The app runs as whoever owns its folder.
  APP_USER=$(stat -c %U "$app_dir")

  step "Checking for local changes"
  if [ -n "$(as_app git status --porcelain --untracked-files=no)" ]; then
    as_app git status --short --untracked-files=no
    echo "The server has uncommitted changes. Sort them out before deploying." >&2
    exit 1
  fi

  step "Backing up the database"
  local backup
  backup="$BACKUP_DIR/before-deploy-$(date +%Y%m%d-%H%M%S).db"
  as_app cp "$DB_FILE" "$backup"
  echo "Saved $backup"

  step "Pulling the latest code"
  local before
  before=$(as_app git rev-parse --short HEAD)
  as_app git pull --ff-only
  echo "$before -> $(as_app git log --oneline -1)"

  step "Installing dependencies"
  as_app npm ci

  step "Updating the database schema"
  as_app sh -c 'set -a; . ./.env; set +a; npx prisma db push'

  step "Building"
  as_app npm run build

  step "Restarting"
  systemctl restart "$SERVICE"

  step "Checking the app responds"
  for _ in $(seq 1 30); do
    if curl -s -o /dev/null "$HEALTH_URL"; then
      echo "Deployed $(as_app git log --oneline -1)"
      return 0
    fi
    sleep 1
  done
  echo "The app didn't respond within 30s. Check: journalctl -u $SERVICE -n 50 --no-pager" >&2
  exit 1
}

as_app() { sudo -u "$APP_USER" -H "$@"; }
step() { printf '\n==> %s\n' "$1"; }

main "$@"
