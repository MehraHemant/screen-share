import { io, Socket } from "socket.io-client";

/**
 * Single Next.js app: Socket.io runs on the same origin (same port).
 * Use env only when the client is served from a different host (e.g. static export).
 */
function getSignalingUrl(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:3000";
  }
  const url = process.env.NEXT_PUBLIC_SIGNALING_URL || window.location.origin;
  const protocol = window.location.protocol;
  if (protocol === "https:" && url.startsWith("http://")) {
    return url.replace(/^http:\/\//, "https://");
  }
  return url;
}

export type JoinRoomPayload = { sessionId: string; role: "sharer" | "viewer" };
export type JoinRoomOk = { viewerCount?: number };
export type JoinRoomError = { message: string };
export type ViewerJoinedPayload = { viewerId: string; viewerCount: number };
export type ViewerLeftPayload = { viewerId: string; viewerCount: number };

export interface SignalingSocket extends Socket {
  joinRoom(
    payload: JoinRoomPayload,
    ack?: (err: Error | null, reply?: JoinRoomOk | JoinRoomError) => void
  ): void;
}

export function createSocketConnection(): SignalingSocket {
  const url = getSignalingUrl();
  const socket = io(url, {
    path: "/socket.io",
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ["websocket", "polling"],
    secure: url.startsWith("https:"),
  }) as SignalingSocket;

  return socket;
}

export function getSignalingUrlForExport(): string {
  return getSignalingUrl();
}
