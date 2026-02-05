"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/Controls";

function generateSessionId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let id = "";
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export default function LandingPage() {
  const [sessionIdInput, setSessionIdInput] = useState("");
  const [generatedId, setGeneratedId] = useState<string | null>(null);

  const handleStartSharing = useCallback(() => {
    const id = generateSessionId();
    setGeneratedId(id);
  }, []);

  const viewerLinkUrl =
    typeof window !== "undefined" && generatedId
      ? `${window.location.origin}/view/${generatedId}`
      : "";
  const viewUrl =
    typeof window !== "undefined" && sessionIdInput.trim()
      ? `${window.location.origin}/view/${sessionIdInput.trim()}`
      : "";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Live Tab Share
          </h1>
          <p className="text-surface-muted text-lg">
            Share your browser tab. Others watch in real time.
          </p>
        </header>

        <div className="space-y-6 rounded-xl bg-surface border border-white/10 p-6">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Start sharing
            </h2>
            {!generatedId ? (
              <Button
                variant="primary"
                className="w-full"
                onClick={handleStartSharing}
              >
                Start Sharing
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">Your session ID</p>
                <p
                  className="font-mono text-lg font-semibold text-accent break-all"
                  data-session-id
                >
                  {generatedId}
                </p>
                <div className="flex gap-2">
                  <Link href={`/share/${generatedId}`} className="flex-1">
                    <Button variant="primary" className="w-full">
                      Go to share page
                    </Button>
                  </Link>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                        navigator.clipboard.writeText(viewerLinkUrl);
                      }
                    }}
                    title="Copy viewer link"
                  >
                    Copy link
                  </Button>
                </div>
              </div>
            )}
          </section>

          <hr className="border-white/10" />

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Join a session
            </h2>
            <label className="block text-sm text-zinc-400">
              Enter session ID
            </label>
            <input
              type="text"
              value={sessionIdInput}
              onChange={(e) => setSessionIdInput(e.target.value)}
              placeholder="e.g. Abc12XyZ34Qr"
              className="w-full px-4 py-3 rounded-lg bg-background border border-white/10 text-foreground placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent"
              maxLength={64}
            />
            <Link
              href={sessionIdInput.trim() ? `/view/${sessionIdInput.trim()}` : "#"}
              className="block"
            >
              <Button
                variant="secondary"
                className="w-full"
                disabled={!sessionIdInput.trim()}
              >
                Join Session
              </Button>
            </Link>
          </section>
        </div>

        <p className="text-center text-sm text-zinc-500">
          Use HTTPS. Screen sharing requires your permission.
        </p>
      </div>
    </main>
  );
}
