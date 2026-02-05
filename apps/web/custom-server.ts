/**
 * Custom Next.js server that also runs Socket.io signaling on the same port.
 * Single process: Next.js app + WebSocket signaling.
 */
import http from "http";
import next from "next";
import { parse } from "url";
import { createSocketServer } from "./server/socket";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOSTNAME || "localhost";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    const url = req.url;
    if (url?.startsWith("/socket.io")) {
      return;
    }
    const parsedUrl = parse(url ?? "/", true);
    handle(req, res, parsedUrl);
  });

  createSocketServer(server);

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.io signaling on same port (path: /socket.io)`);
  });
});
