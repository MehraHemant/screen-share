"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/Controls";
import type { ChatMessage } from "@/hooks/useChat";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  myRole: "sharer" | "viewer";
  isOpen?: boolean;
  onToggle?: () => void;
}

export function ChatPanel({
  messages,
  onSend,
  myRole,
  isOpen = true,
  onToggle,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (t) {
      onSend(t);
      setInput("");
    }
  };

  return (
    <div className="flex flex-col bg-surface rounded-lg border border-white/10 overflow-hidden min-h-0 max-h-[280px]">
      <button
        type="button"
        className="flex items-center justify-between px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-white/5"
        onClick={onToggle}
      >
        Chat
        {onToggle && (
          <span className="text-zinc-400">{isOpen ? "−" : "+"}</span>
        )}
      </button>
      {isOpen && (
        <>
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]"
          >
            {messages.length === 0 && (
              <p className="text-zinc-500 text-sm">No messages yet.</p>
            )}
            {messages.map((msg, i) => (
              <div
                key={`${msg.ts}-${i}`}
                className={`text-sm ${
                  msg.role === myRole
                    ? "text-right ml-8"
                    : "text-left mr-8"
                }`}
              >
                <span className="text-zinc-500 text-xs">
                  {msg.role === "sharer" ? "Host" : "Viewer"}
                </span>
                <p className="break-words text-foreground">{msg.text}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2 p-2 border-t border-white/10">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 px-3 py-2 rounded-lg bg-background border border-white/10 text-foreground text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent"
              maxLength={2000}
            />
            <Button type="submit" variant="primary">
              Send
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
