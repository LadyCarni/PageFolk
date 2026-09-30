# Book Club App

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
   - Production: `https://<your-subdomain>/api/auth/callback/google`
4. Copy the client ID and secret into `.env` (or the production `.env` on the VPS).

## Deploying to your VPS

1. Clone the repo to `/opt/bookclub` on the VPS.
2. `npm ci`
3. Copy `.env.example` to `/opt/bookclub/.env` and fill in production values
   (production `DATABASE_URL`, `NEXTAUTH_URL` set to `https://<your-subdomain>`,
   production Google OAuth credentials, `ADMIN_EMAIL`).
4. `npx prisma migrate deploy`
5. `npm run build`
6. Copy `deploy/bookclub.service` to `/etc/systemd/system/bookclub.service`,
   then `sudo systemctl enable --now bookclub`.
7. Copy `deploy/nginx.conf.example` to your nginx sites config (adjust
   `server_name`), reload nginx, then run `certbot --nginx -d <your-subdomain>`
   to provision TLS.
8. Add a nightly backup cron job for the SQLite file, e.g.:
   `0 3 * * * cp /opt/bookclub/prisma/prod.db /opt/bookclub/backups/prod-$(date +\%F).db`
   (prune old backups periodically).

## Deploying an update

```bash
git pull
npm ci
npx prisma migrate deploy
npm run build
sudo systemctl restart bookclub
```
