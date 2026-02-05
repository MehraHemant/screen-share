# Standalone signaling server

Socket.io signaling only. Use this when the **frontend is on Vercel** (Vercel cannot run WebSockets).

## Deploy to Railway

1. Create a new project on [Railway](https://railway.app).
2. Add a service from GitHub (this repo), **Root Directory:** `signaling`.
3. Set env: `CORS_ORIGIN=https://your-app.vercel.app` (your Vercel URL).
4. Deploy. Copy the public URL (e.g. `https://xxx.up.railway.app`).
5. In Vercel, set `NEXT_PUBLIC_SIGNALING_URL` to that URL (no trailing slash).

## Deploy to Fly.io

From the `signaling` folder:

```bash
fly launch
fly secrets set CORS_ORIGIN=https://your-app.vercel.app
fly deploy
```

Then set `NEXT_PUBLIC_SIGNALING_URL=https://your-app.fly.dev` in Vercel.

## Local

```bash
cd signaling
npm install
npm run dev
```

Runs on port 3001. For local Next.js dev you can use the built-in custom server (same port as the app); this standalone server is for production when the frontend is on Vercel.
