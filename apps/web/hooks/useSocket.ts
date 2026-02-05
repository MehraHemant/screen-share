"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createSocketConnection, type SignalingSocket } from "@/lib/socket";
import type { JoinRoomOk, JoinRoomError } from "@/lib/socket";

export type SocketStatus = "disconnected" | "connecting" | "connected" | "error";

export function useSocket() {
  const [status, setStatus] = useState<SocketStatus>("disconnected");
  const socketRef = useRef<SignalingSocket | null>(null);

  const getSocket = useCallback((): SignalingSocket | null => {
    if (socketRef.current?.connected) return socketRef.current;
    if (socketRef.current) return socketRef.current;
    const socket = createSocketConnection();
    socketRef.current = socket;

    socket.on("connect", () => setStatus("connected"));
    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on("connect_error", () => setStatus("error"));
    socket.on("reconnect", () => setStatus("connected"));

    return socket;
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    if (socket.connected) setStatus("connected");
    else setStatus("connecting");
    return () => {
      // Don't disconnect on unmount so multiple hooks can share
    };
  }, [getSocket]);

  const joinRoom = useCallback(
    (
      sessionId: string,
      role: "sharer" | "viewer"
    ): Promise<JoinRoomOk | JoinRoomError> => {
      return new Promise((resolve) => {
        const s = getSocket();
        if (!s) {
          resolve({ message: "Socket not available" });
          return;
        }
        s.emit("join-room", { sessionId, role }, (err: Error | null, reply?: JoinRoomOk | JoinRoomError) => {
          if (err) {
            resolve({ message: err.message });
            return;
          }
          resolve(reply ?? { message: "Unknown response" });
        });
      });
    },
    [getSocket]
  );

  return {
    socket: socketRef.current,
    getSocket,
    status,
    joinRoom,
  };
}
