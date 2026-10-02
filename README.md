# PageFolk

## Local development

1. `npm install`
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `NEXTAUTH_SECRET`
   (`openssl rand -base64 32`), `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`
   (see below), and `ADMIN_EMAIL` (your own Google account email).
3. `npx prisma db push`
4. `npm run dev`

## Google OAuth setup

1. In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create a project (or reuse one) and configure the OAuth consent screen.
2. Create an OAuth 2.0 Client ID of type "Web application."
3. Add an authorized redirect URI:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://bookclub.carynfarvour.design/api/auth/callback/google`
4. Copy the client ID and secret into `.env` (or the production `.env` on the VPS).

## Production

Live at https://bookclub.carynfarvour.design on a DigitalOcean Droplet
(Ubuntu 24.04, 1 GB RAM + 2 GB swap). Log in with `ssh bookclub` (alias in
`~/.ssh/config`, key `~/.ssh/id_ed25519_droplet`).

- App: `/opt/bookclub`, run by the `bookclub` user as the `bookclub` systemd
  service on port 3002; nginx proxies to it, certbot handles HTTPS and renewal.
- Config: `/opt/bookclub/.env` (readable only by `bookclub`). The Font Awesome
  package token is in `/home/bookclub/.npmrc`.
- Database: `/opt/bookclub/prisma/prod.db`. Backed up nightly at 3am to
  `/opt/bookclub/backups/` (14 days kept) by `/etc/cron.d/bookclub-backup`.
- Firewall (ufw) allows only SSH, 80 and 443.
- Google OAuth is in Testing mode: each tester must be added under Google Auth
  Platform → Audience → Test users, and in the app's Allowed emails panel.

## Deploying an update

```bash
ssh bookclub
cd /opt/bookclub
sudo -u bookclub git pull
sudo -u bookclub -H npm ci
sudo -u bookclub sh -c 'set -a; . ./.env; set +a; npx prisma db push'
sudo -u bookclub npm run build
systemctl restart bookclub
```
