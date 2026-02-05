import http from "http";
import https from "https";
import fs from "fs";
import { createSocketServer } from "./socket";

const PORT = Number(process.env.PORT) || 3001;
const useHttps =
  process.env.USE_HTTPS === "1" ||
  process.env.USE_HTTPS === "true";
const certPath = process.env.SSL_CERT_PATH;
const keyPath = process.env.SSL_KEY_PATH;

function createRequestHandler(
  req: http.IncomingMessage,
  res: http.ServerResponse
): void {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", service: "signaling" }));
}

let server: http.Server | https.Server;

if (useHttps && certPath && keyPath) {
  try {
    server = https.createServer(
      {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
      },
      createRequestHandler
    );
    console.log("Using HTTPS");
  } catch (err) {
    console.error("HTTPS config failed, falling back to HTTP:", err);
    server = http.createServer(createRequestHandler);
  }
} else {
  server = http.createServer(createRequestHandler);
}

createSocketServer(server);

server.listen(PORT, () => {
  const scheme = server instanceof https.Server ? "https" : "http";
  console.log(`Signaling server listening on ${scheme}://localhost:${PORT}`);
});

process.on("SIGTERM", () => {
  server.close();
  process.exit(0);
});
