"use client";

import { useState, useCallback, useEffect } from "react";
import type { SignalingSocket } from "@/lib/socket";

export interface ChatMessage {
  from: string;
  role: "sharer" | "viewer";
  text: string;
  ts: number;
}

export function useChat(socket: SignalingSocket | null, sessionId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!socket || !sessionId) return;
    const handler = (msg: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-199), msg]);
    };
    socket.on("chat-message", handler);
    return () => {
      socket.off("chat-message", handler);
    };
  }, [socket, sessionId]);

  const send = useCallback(
    (text: string) => {
      if (!socket || !text.trim()) return;
      socket.emit("chat-message", { text: text.trim() });
    },
    [socket]
  );

  return { messages, send };
}
