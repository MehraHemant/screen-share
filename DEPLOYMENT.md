# Deployment notes

## Overview

- **Web app (Next.js):** Deploy to **Vercel** (or any Node/static host).
- **Signaling server (Socket.io):** Deploy to **Fly.io**, **Railway**, or any Node host with a public URL.

Both must be served over **HTTPS** in production so that:

- `getDisplayMedia()` (tab capture) runs in a secure context.
- WebRTC works without issues.

---

## 1. Deploy signaling server

### Fly.io

1. Install [flyctl](https://fly.io/docs/hands-on/install-flyctl/).
2. From repo root: `cd apps/server`.
3. Run `fly launch` (choose app name, region; no need for a database).
4. Set secrets/env:
   - `fly secrets set CORS_ORIGIN=https://your-app.vercel.app`
   - Optionally: `fly secrets set PORT=3001` (Fly usually sets PORT).
5. Build and run:
   - In `apps/server`, ensure `"start": "node dist/index.js"` and that `build` produces `dist/`.
   - Fly will use `npm run build` (or your build command) and then `npm start` (or the start command you configure).
6. Deploy: `fly deploy`.
7. Note the app URL (e.g. `https://your-app.fly.dev`) — use this as `NEXT_PUBLIC_SIGNALING_URL` in the web app.

**Dockerfile (optional, for Fly):** You can add a minimal Dockerfile in `apps/server` that installs deps, runs `pnpm build`, and runs `node dist/index.js` so Fly builds the image automatically.

### Railway

1. Create a new project and add a service from the repo (or connect GitHub).
2. Set root directory to `apps/server` (or the path that contains `package.json` for the server).
3. Set env vars: `PORT` (if needed), `CORS_ORIGIN=https://your-app.vercel.app`.
4. Build command: `pnpm install && pnpm build` (or npm equivalent).
5. Start command: `pnpm start` or `node dist/index.js`.
6. Use the generated public URL as `NEXT_PUBLIC_SIGNALING_URL`.

---

## 2. Deploy Next.js (Vercel)

1. Connect the repo to Vercel and set the **root directory** to `apps/web` (or the path that contains the Next.js app).
2. In Vercel project **Settings → Environment variables**, add:
   - `NEXT_PUBLIC_SIGNALING_URL` = `https://your-signaling-server.fly.dev` (or your Railway/other URL). **No trailing slash.**
3. Deploy. The app will use this URL to connect to Socket.io for signaling.

---

## 3. Post-deploy checks

- Open the app over **HTTPS**.
- Start a share session and join from another device or incognito window.
- Confirm the viewer sees the stream and that “Connection” / “Connected” state appears.
- If viewers cannot connect, verify:
  - `NEXT_PUBLIC_SIGNALING_URL` matches the real signaling server URL (HTTPS).
  - `CORS_ORIGIN` on the server includes your Vercel (or frontend) origin.

---

## 4. Auto-generated share link (bonus)

The app already generates a random session ID on “Start Sharing” and builds the share link on the share page. To make the landing page redirect straight to the share page with a new ID, you can change “Start Sharing” to navigate to `/share/[newId]` (e.g. using `router.push('/share/' + generateSessionId())`) so the share link is the first thing the user sees.

---

## 5. MediaRecorder recording (bonus)

For recording the shared tab on the **sharer** side:

- After `getDisplayMedia()` returns a `MediaStream`, create `new MediaRecorder(stream, { mimeType: 'video/webm' })`.
- Call `recorder.start()` on a user gesture, and `recorder.stop()` when done; use `ondataavailable` to collect blobs and optionally offer a download.

This is client-only and does not require server or deployment changes.
