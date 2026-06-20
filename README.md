# Daily Planner — Deployment Guide

This app has two parts:
- **backend/** — Express API + Postgres, deployed on Render
- **frontend/** — the dashboard UI (index.html), deployed on Vercel

## 1. Push to GitHub

```bash
cd build-log
git init
git add .
git commit -m "Initial commit: Daily Build Log"
```

Create a new repo on GitHub (e.g. `daily-build-log`), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/daily-build-log.git
git branch -M main
git push -u origin main
```

## 2. Deploy the backend on Render

1. Go to https://render.com → New → **PostgreSQL**. Create a free database, name it e.g. `daily-build-log-db`. Copy its "Internal Database URL" once it's ready.
2. Go to New → **Web Service** → connect your GitHub repo.
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
   - Plan: Free
3. Under **Environment**, add two variables:
   - `DATABASE_URL` = the Postgres URL from step 1
   - `API_KEY` = any long random string you make up (this is your password protecting the API — e.g. generate one with `openssl rand -hex 32`)
4. Deploy. Once live, Render gives you a URL like `https://daily-build-log-api.onrender.com`. Test it: visit `https://YOUR-URL/api/health` — should return `{"ok":true}`.

Note: Render's free web services spin down when idle and take ~30-50 seconds to wake up on the first request after a while. Fine for personal daily use; just expect a short delay if you haven't opened it in hours.

## 3. Configure the frontend

Open `frontend/index.html` and edit these two lines near the top of the `<script>`:

```js
const API_BASE = 'https://daily-build-log-api.onrender.com'; // your Render URL, no trailing slash
const API_KEY = 'the-same-random-string-you-set-on-render';
```

Commit and push that change.

## 4. Deploy the frontend on Vercel

1. Go to https://vercel.com → New Project → import the same GitHub repo.
2. Root directory: `frontend`
3. Framework preset: **Other** (it's a static HTML file, no build step needed)
4. Deploy.

You'll get a URL like `https://daily-build-log.vercel.app` — open it, bookmark it, and your data now lives in a real Postgres database instead of being tied to a Claude conversation.

## Updating later

Any time you want to change the design or add a feature, edit the files, commit, and push — both Render and Vercel auto-redeploy on every push to `main`.

## Security note

The `API_KEY` is a simple shared secret, sent as a header on every request. It's enough to stop random bots from writing to your database, but it's visible to anyone who views your frontend's source code. Don't put anything truly sensitive in this log. If you want real per-user authentication later, that's a bigger upgrade (e.g. adding Supabase Auth or Clerk) — let me know if you want that.
