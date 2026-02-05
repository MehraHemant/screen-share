"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Controls, Button } from "@/components/Controls";
import { useSocket } from "@/hooks/useSocket";
import { useScreenShare } from "@/hooks/useScreenShare";
import { useWebRTCSharer } from "@/hooks/useWebRTC";

function SharePageContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : "";

  const [viewerCount, setViewerCount] = useState(0);
  const { getSocket, status: socketStatus, joinRoom } = useSocket();
  const { state: shareState, stream, error: shareError, startSharing, stopSharing } = useScreenShare();

  useWebRTCSharer({
    socket: getSocket() ?? null,
    sessionId,
    stream,
    onViewerCount: setViewerCount,
  });

  const handleStartShare = useCallback(async () => {
    await startSharing();
  }, [startSharing]);

  useEffect(() => {
    if (!sessionId || shareState !== "active") return;
    joinRoom(sessionId, "sharer").then((reply) => {
      if ("message" in reply && reply.message) {
        console.error("Join room error:", reply.message);
        return;
      }
      if ("viewerCount" in reply) setViewerCount(reply.viewerCount ?? 0);
    });
  }, [sessionId, shareState, joinRoom]);

  useEffect(() => {
    if (shareState === "stopped") {
      router.push("/");
    }
  }, [shareState, router]);

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/view/${sessionId}` : "";
  const copyLink = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl);
    }
  }, [shareUrl]);

  if (!sessionId) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-red-400">Invalid session.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-sm font-medium ${
              shareState === "active"
                ? "bg-red-500/20 text-red-400 animate-pulse-soft"
                : "bg-surface-muted text-zinc-400"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current" />
            {shareState === "active" ? "LIVE" : "Not sharing"}
          </span>
          <span className="text-sm text-zinc-400">
            {viewerCount} viewer{viewerCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500 font-mono">{sessionId}</span>
          <Button variant="secondary" onClick={copyLink}>
            Copy link
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0 rounded-xl overflow-hidden bg-black border border-white/10">
        {shareState === "idle" || shareState === "requesting" || shareState === "error" ? (
          <div className="h-full min-h-[320px] flex flex-col items-center justify-center gap-4 p-6">
            {shareState === "requesting" && (
              <p className="text-zinc-400">Requesting tab access…</p>
            )}
            {shareState === "error" && shareError && (
              <p className="text-red-400 text-center">{shareError}</p>
            )}
            {shareState === "idle" && (
              <p className="text-zinc-400 text-center">
                Click below to share this tab. Only the current browser tab will be shared.
                <br />
                <span className="text-sm">Check &quot;Share tab audio&quot; in the dialog so viewers can hear the tab.</span>
              </p>
            )}
            <Button
              variant="primary"
              onClick={handleStartShare}
              disabled={shareState === "requesting"}
            >
              {shareState === "requesting" ? "Requesting…" : "Share this tab"}
            </Button>
          </div>
        ) : (
          <VideoPlayer stream={stream} className="w-full h-full min-h-[320px]" muted />
        )}
      </div>

      <div className="mt-4">
        <Controls>
          {shareState === "active" && (
            <Button variant="danger" onClick={stopSharing}>
              Stop sharing
            </Button>
          )}
          <span className="text-sm text-zinc-500">
            Socket: {socketStatus}
          </span>
        </Controls>
      </div>
    </main>
  );
}

export default function SharePage() {
  return <SharePageContent />;
}
