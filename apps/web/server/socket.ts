import type { Server } from "http";
import { Server as SocketIoServer, Socket } from "socket.io";
import {
  isValidSessionId,
  getOrCreateRoom,
  getRoom,
  setSharer,
  removeSharer,
  addViewer,
  removeViewer,
  getViewerCount,
  getViewerIds,
  startRoomCleanup,
} from "./rooms";

export type SignalingEvents = {
  "join-room": { sessionId: string; role: "sharer" | "viewer" };
  "join-room-ok": { viewerCount?: number };
  "join-room-error": { message: string };
  offer: { to: string; sdp: RTCSessionDescriptionInit };
  answer: { to: string; sdp: RTCSessionDescriptionInit };
  "ice-candidate": { to: string; candidate: RTCIceCandidateInit };
  "viewer-joined": { viewerId: string; viewerCount: number };
  "viewer-left": { viewerId: string; viewerCount: number };
  "sharer-left": void;
  "chat-message": { text: string };
  "viewer-mic-offer": { to: string; sdp: RTCSessionDescriptionInit };
  "viewer-mic-answer": { to: string; sdp: RTCSessionDescriptionInit };
  "viewer-mic-ice": { to: string; candidate: RTCIceCandidateInit };
};

export function createSocketServer(httpServer: Server): SocketIoServer {
  const io = new SocketIoServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin: process.env.CORS_ORIGIN ?? "*",
      methods: ["GET", "POST"],
    },
    pingTimeout: 20000,
    pingInterval: 10000,
  });

  startRoomCleanup();

  io.on("connection", (socket: Socket) => {
    let currentSessionId: string | null = null;
    let currentRole: "sharer" | "viewer" | null = null;

    socket.on(
      "join-room",
      (
        payload: SignalingEvents["join-room"],
        ack?: (err: Error | null, reply?: SignalingEvents["join-room-ok"] | SignalingEvents["join-room-error"]) => void
      ) => {
        const { sessionId, role } = payload ?? {};
        if (!sessionId || !role) {
          ack?.(null, { message: "Missing sessionId or role" });
          return;
        }
        if (!isValidSessionId(sessionId)) {
          ack?.(null, { message: "Invalid session ID" });
          return;
        }

        if (role === "sharer") {
          const ok = setSharer(sessionId, socket.id);
          if (!ok) {
            ack?.(null, { message: "Room already has a sharer" });
            return;
          }
          currentSessionId = sessionId;
          currentRole = "sharer";
          socket.join(sessionId);
          const viewerCount = getViewerCount(sessionId);
          getViewerIds(sessionId).forEach((viewerId) => {
            socket.emit("viewer-joined", { viewerId, viewerCount });
          });
          ack?.(null, { viewerCount });
          return;
        }

        if (role === "viewer") {
          const room = getOrCreateRoom(sessionId);
          if (room.viewers.has(socket.id)) {
            ack?.(null, { viewerCount: getViewerCount(sessionId) });
            return;
          }
          const maxViewers = process.env.MAX_VIEWERS_PER_ROOM
            ? parseInt(process.env.MAX_VIEWERS_PER_ROOM, 10)
            : 0;
          if (maxViewers > 0 && getViewerCount(sessionId) >= maxViewers) {
            ack?.(null, { message: "Viewer limit reached" });
            return;
          }
          addViewer(sessionId, socket.id);
          currentSessionId = sessionId;
          currentRole = "viewer";
          socket.join(sessionId);
          const viewerCount = getViewerCount(sessionId);
          socket.to(sessionId).emit("viewer-joined", {
            viewerId: socket.id,
            viewerCount,
          });
          ack?.(null, { viewerCount });
          return;
        }

        ack?.(null, { message: "Invalid role" });
      }
    );

    socket.on("offer", (payload: SignalingEvents["offer"]) => {
      if (!currentSessionId || currentRole !== "sharer") return;
      const room = getRoom(currentSessionId);
      if (!room?.sharerId || room.sharerId !== socket.id) return;
      socket.to(payload.to).emit("offer", {
        from: socket.id,
        sdp: payload.sdp,
      });
    });

    socket.on("answer", (payload: SignalingEvents["answer"]) => {
      if (!currentSessionId || currentRole !== "viewer") return;
      socket.to(payload.to).emit("answer", {
        from: socket.id,
        sdp: payload.sdp,
      });
    });

    socket.on("ice-candidate", (payload: SignalingEvents["ice-candidate"]) => {
      if (!currentSessionId) return;
      socket.to(payload.to).emit("ice-candidate", {
        from: socket.id,
        candidate: payload.candidate,
      });
    });

    socket.on("chat-message", (payload: SignalingEvents["chat-message"]) => {
      if (!currentSessionId || !payload?.text?.trim()) return;
      const role = currentRole === "sharer" ? "sharer" : "viewer";
      io.to(currentSessionId).emit("chat-message", {
        from: socket.id,
        role,
        text: payload.text.trim().slice(0, 2000),
        ts: Date.now(),
      });
    });

    socket.on("viewer-mic-offer", (payload: SignalingEvents["viewer-mic-offer"]) => {
      if (!currentSessionId || currentRole !== "viewer") return;
      socket.to(payload.to).emit("viewer-mic-offer", {
        from: socket.id,
        sdp: payload.sdp,
      });
    });

    socket.on("viewer-mic-answer", (payload: SignalingEvents["viewer-mic-answer"]) => {
      if (!currentSessionId || currentRole !== "sharer") return;
      socket.to(payload.to).emit("viewer-mic-answer", {
        from: socket.id,
        sdp: payload.sdp,
      });
    });

    socket.on("viewer-mic-ice", (payload: SignalingEvents["viewer-mic-ice"]) => {
      if (!currentSessionId) return;
      socket.to(payload.to).emit("viewer-mic-ice", {
        from: socket.id,
        candidate: payload.candidate,
      });
    });

    socket.on("disconnect", () => {
      if (!currentSessionId) return;
      if (currentRole === "sharer") {
        removeSharer(currentSessionId, socket.id);
        io.to(currentSessionId).emit("sharer-left");
      } else if (currentRole === "viewer") {
        removeViewer(currentSessionId, socket.id);
        const viewerCount = getViewerCount(currentSessionId);
        socket.to(currentSessionId).emit("viewer-left", {
          viewerId: socket.id,
          viewerCount,
        });
      }
    });
  });

  return io;
}
