import http from "http";
import { createSocketServer } from "./socket";

const PORT = parseInt(process.env.PORT || "3001", 10);

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", service: "signaling" }));
});

createSocketServer(server);

server.listen(PORT, () => {
  console.log(`Signaling server on port ${PORT}`);
});
