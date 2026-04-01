# Vercel Deployment Guide

## What this app needs on Vercel
InterviewGuru is not a plain static site. It needs:
- a React frontend build
- a serverless backend entrypoint for `/api/*`
- production environment variables in Vercel
- same-origin API calls from the frontend

If any of those are missing, the app may work locally but fail on Vercel.

## Current deployment shape
The repo is set up as a single Vercel project with:
- frontend output in `build/`
- API routes served from `api/[...path].ts`
- backend logic reused from `backend/api/server.ts`
- frontend API calls using same-origin `/api/...`

This avoids cross-origin calls and avoids depending on a second Vercel deployment.

## Why local works but Vercel fails
Local works because your machine has:
- `.env` values loaded directly
- local dev proxy for `/api`
- your current backend process running on localhost

Vercel fails when:
- production env vars are missing
- the frontend points to the wrong API base URL
- the backend is still expected to live on another Vercel project
- the API route is not handled by a real serverless function

## Required files
These are the files that control deployment behavior:
- [vercel.json](../vercel.json)
- [api/[...path].ts](../api/%5B...path%5D.ts)
- [backend/api/server.ts](../backend/api/server.ts)
- [shared/utils/config.ts](../shared/utils/config.ts)
- [vite.config.ts](../vite.config.ts)
- [package.json](../package.json)

## Vercel settings
Use these project settings:
- Framework Preset: Other
- Build Command: `npm run build`
- Output Directory: `build`
- Install Command: default

Do not add a custom `functions` block unless you are sure the function path matches a real file in `api/`.

## Vercel env vars
Set these in the Vercel project dashboard:

| Variable | Required | Example | Notes |
|---|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | `pk_live_...` | Production Clerk key for the frontend |
| `DATABASE_URL` | Yes | `postgresql://...` | Neon/Postgres connection string |
| `GROQ_API_KEY` | Yes | `gsk_...` | Used for transcription and analysis |
| `GEMINI_API_KEY` | Yes | `AIza...` | Used for TTS |
| `TRIAL_SECURITY_SALT` | Recommended | any long random string | Used to hash trial fingerprints |
| `VITE_API_URL` | Optional | empty or same-origin | Only set if you really need a custom backend URL |

### Copy-paste env block
Use this as the Vercel import template. Replace the placeholder values with your real production secrets.

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_production_key
DATABASE_URL=postgresql://your_user:your_password@your-neon-host.neon.tech/your_db?sslmode=require&channel_binding=require
GROQ_API_KEY=gsk_your_groq_key
GEMINI_API_KEY=AIza_your_gemini_key
TRIAL_SECURITY_SALT=replace_with_a_long_random_secret
VITE_API_URL=
```

Notes:
- Keep `VITE_API_URL` empty for same-origin `/api` routing.
- Do not paste local `.env` values into Vercel unless they are production secrets.
- If you want a single-site deploy, this is the minimum set you need for the app to work.

### Custom domain note
If you are using a custom Vercel domain, the most common remaining issue is Clerk, not the API route.

Make sure the custom domain is added in the Clerk dashboard and that your allowed origins and redirect URLs include:
- your custom domain, for example `https://your-custom-domain.com`
- the `vercel.app` preview domain if you still use preview deployments

If Clerk still fails after deploy, check these first before changing the code again.

Important:
- Do not rely on local `.env` for Vercel.
- Do not use the Clerk dev key in production.
- If `DATABASE_URL` is missing, `/api/usage` and other DB-backed routes will fail.

## Minimal Vercel flow
1. Push the repo to GitHub.
2. Import the repo into Vercel.
3. Set the env vars above.
4. Deploy.
5. Open the deployed frontend URL.
6. Test `/api/usage`, `/api/transcribe`, and `/api/analyze`.

## What the API path does
The frontend should call `/api/...` on the same domain.

Example:
- Frontend URL: `https://your-app.vercel.app`
- API URL: `https://your-app.vercel.app/api/usage`

That same-origin setup is what avoids CORS problems.

## Common failures and fixes

### 1. `DEPLOYMENT_NOT_FOUND`
Cause:
- the frontend is trying to proxy to an old Vercel project
- or the backend deployment URL is wrong

Fix:
- use the same Vercel project with `api/[...path].ts`
- remove any rewrite to a dead external project

### 2. `405 Method Not Allowed`
Cause:
- `/api/*` is being handled by the SPA fallback instead of a serverless function

Fix:
- make sure `/api/:path*` routes to `api/[...path].ts`
- keep the SPA fallback only for non-API paths

### 3. `500 Authentication failed`
Cause:
- missing `DATABASE_URL`
- wrong table schema
- missing production Clerk key

Fix:
- set Vercel env vars
- redeploy
- check backend logs

### 4. Clerk dev key warning
Cause:
- production build still uses a dev publishable key

Fix:
- replace `VITE_CLERK_PUBLISHABLE_KEY` in Vercel with the production key
- confirm the custom domain is allowed in Clerk

### 5. CORS error
Cause:
- frontend is calling a different domain directly

Fix:
- use same-origin `/api` calls
- let Vercel rewrite/proxy handle it

## Local vs Vercel behavior

### Local
- `npm run electron:dev` or `npm start`
- backend runs on localhost
- dev proxy handles `/api`
- `.env` is read directly

### Vercel
- frontend build is static
- backend must come from `api/[...path].ts`
- env vars must be configured in Vercel dashboard
- same-origin `/api` must be used

## Deployment checklist
- [ ] `vercel.json` points `/api` to the local serverless entrypoint
- [ ] `api/[...path].ts` exists
- [ ] `build/` is the output directory
- [ ] `VITE_CLERK_PUBLISHABLE_KEY` is production value
- [ ] `DATABASE_URL` is set
- [ ] `GROQ_API_KEY` is set
- [ ] `GEMINI_API_KEY` is set
- [ ] `TRIAL_SECURITY_SALT` is set
- [ ] frontend uses same-origin `/api`
- [ ] redeploy completed after env changes

## Recommended final setup
If you want the simplest stable deployment:
- keep frontend and backend in the same Vercel project
- use `api/[...path].ts` for serverless backend
- use same-origin `/api` calls from the frontend
- set all secrets in Vercel env vars
- do not keep a second backend Vercel project unless absolutely necessary

## Short answer
Local works because your local env and proxy are already correct.
Vercel fails when the production env vars or routing are wrong.
The fix is to keep the app in one Vercel project with the serverless API entrypoint and the correct production env vars.
