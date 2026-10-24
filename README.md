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

Runs as a Next.js server (`npm run build`, then `npm start`, port 3002) behind
nginx with HTTPS, as a systemd service. Example config is in `deploy/`. To deploy
an update, run `deploy/deploy.sh` on the server as root. It backs up the
database, pulls, runs `npm ci`, `npx prisma db push` and `npm run build`, then
restarts the service, and stops at the first step that fails.

Installing dependencies needs a Font Awesome Pro package token in the
machine's user-level `~/.npmrc`.

## Access

Anyone can sign in with Google. Accounts that aren't on the allowed list are
turned away and appear under "Waiting for approval" on the Members page, where
the admin (`ADMIN_EMAIL`) can approve or dismiss them.
