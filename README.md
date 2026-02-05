# Live Tab Share (Next.js)

One **Next.js** app: frontend + Socket.io signaling on the same port. No Turbo, no separate server process.

- **Framework:** Next.js (App Router) + Tailwind CSS  
- **Signaling:** Socket.io (runs inside the Next.js custom server)  
- **Streaming:** WebRTC (tab share + optional tab audio)

## Structure

```
screen-share-monorepo/
├── apps/web/
│   ├── app/              # Next.js pages (/, /share/[id], /view/[id])
│   ├── components/
│   ├── hooks/
│   ├── lib/              # Client socket, webrtc
│   ├── server/           # Signaling: rooms.ts, socket.ts
│   ├── custom-server.ts  # Custom server: Next.js + Socket.io on one port
│   ├── package.json
│   └── ...
├── package.json          # Root: runs apps/web
└── README.md
```

## Setup

```bash
npm install
```

Optional: copy `apps/web/.env.example` to `apps/web/.env.local` (only needed if the client is on a different host).

## Run

```bash
npm run dev
```

- App + Socket.io: **http://localhost:3000** (single process)

Build and start for production:

```bash
npm run build
npm run start
```

## Usage

1. **/** — Start sharing (generates session ID) or join with a session ID.  
2. **/share/[sessionId]** — Share your browser tab (and optional tab audio).  
3. **/view/[sessionId]** — Watch the shared tab (view-only, optional unmute for audio).

All logic runs in the Next.js app; Socket.io uses the same port via the custom server.

---

## Deploying to Vercel (frontend only)

**Vercel does not run a persistent Node server or WebSockets.** The custom server (and Socket.io) does not run on Vercel, so `wss://your-app.vercel.app/socket.io` will always fail.

**Fix:** Run the signaling server elsewhere and point the frontend at it.

1. **Deploy the standalone signaling server** (in this repo: `/signaling`) to **Railway**, **Fly.io**, or **Render**:
   - In the repo, open the `signaling` folder.
   - Connect it to Railway/Fly.io/Render and deploy (build: `npm install && npm run build`, start: `npm start`).
   - Set env: `CORS_ORIGIN=https://screen-share-web-mu.vercel.app` (your Vercel URL).
   - Note the public URL (e.g. `https://your-signaling.up.railway.app`).

2. **In Vercel** (your Next.js project): add an environment variable:
   - **Name:** `NEXT_PUBLIC_SIGNALING_URL`  
   - **Value:** `https://your-signaling.up.railway.app` (no trailing slash)

3. Redeploy the frontend on Vercel. The app will connect to your signaling server and WebSockets will work.
