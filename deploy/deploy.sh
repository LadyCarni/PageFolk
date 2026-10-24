#!/usr/bin/env bash
# Deploys the latest master on the server: back up, pull, install, update the schema, build, restart.
# Run as root on the server:  sudo /opt/bookclub/deploy/deploy.sh
# Stops at the first failure, so a failed build never gets restarted into.
set -euo pipefail

APP_DIR=/opt/bookclub
APP_USER=bookclub
SERVICE=bookclub
PORT=3002

# Everything lives in main so bash reads the whole script before running it;
# the git pull below may replace this file mid-run.
main() {
  if [ "$(id -u)" -ne 0 ]; then
    echo "Run with sudo: sudo $0" >&2
    exit 1
  fi
  cd "$APP_DIR"
  as_app() { sudo -u "$APP_USER" -H "$@"; }

  step "Checking for local changes"
  if [ -n "$(as_app git status --porcelain --untracked-files=no)" ]; then
    as_app git status --short --untracked-files=no
    echo "The server has uncommitted changes. Sort them out before deploying." >&2
    exit 1
  fi

  step "Backing up the database"
  local backup="backups/prod-before-deploy-$(date +%Y%m%d-%H%M%S).db"
  as_app cp prisma/prod.db "$backup"
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
    if curl -s -o /dev/null "http://127.0.0.1:$PORT/"; then
      echo "Deployed $(as_app git log --oneline -1)"
      return 0
    fi
    sleep 1
  done
  echo "The app didn't respond on port $PORT within 30s. Check: journalctl -u $SERVICE -n 50 --no-pager" >&2
  exit 1
}

step() { printf '\n==> %s\n' "$1"; }

main "$@"
