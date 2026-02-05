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
