"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Controls, Button } from "@/components/Controls";
import { useSocket } from "@/hooks/useSocket";
import { useWebRTCViewer, type WebRTCState } from "@/hooks/useWebRTC";

function ViewPageContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : "";

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [webrtcState, setWebrtcState] = useState<WebRTCState>("idle");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);

  const { getSocket, status: socketStatus, joinRoom } = useSocket();

  useWebRTCViewer({
    socket: getSocket() ?? null,
    sessionId,
    onStream: setRemoteStream,
    onStateChange: setWebrtcState,
  });

  useEffect(() => {
    if (!sessionId) return;
    setJoinError(null);
    joinRoom(sessionId, "viewer").then((reply) => {
      if ("message" in reply && reply.message) {
        setJoinError(reply.message);
      }
    });
  }, [sessionId, joinRoom]);

  const goHome = useCallback(() => {
    router.push("/");
  }, [router]);

  if (!sessionId) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-red-400">Invalid session.</p>
      </main>
    );
  }

  const waiting = webrtcState === "idle" || webrtcState === "connecting";
  const failed = webrtcState === "failed" || webrtcState === "closed";

  return (
    <main className="min-h-screen flex flex-col p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-sm font-medium ${
              webrtcState === "connected"
                ? "bg-green-500/20 text-green-400"
                : "bg-surface-muted text-zinc-400"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current" />
            {webrtcState === "connected"
              ? "Connected"
              : waiting
                ? "Waiting for sharer…"
                : "Disconnected"}
          </span>
          <span className="text-sm text-zinc-500 font-mono">{sessionId}</span>
        </div>
        <Button variant="secondary" onClick={goHome}>
          Leave
        </Button>
      </header>

      <div className="flex-1 min-h-0 rounded-xl overflow-hidden bg-black border border-white/10 relative">
        {!remoteStream ? (
          <div className="h-full min-h-[320px] flex flex-col items-center justify-center gap-4 p-6">
            {joinError && (
              <p className="text-red-400 text-center">{joinError}</p>
            )}
            {waiting && !joinError && (
              <p className="text-zinc-400 text-center">
                Waiting for the host to start sharing…
              </p>
            )}
            {failed && !joinError && (
              <p className="text-zinc-400 text-center">
                Connection lost. The host may have stopped sharing.
              </p>
            )}
            <Button variant="secondary" onClick={goHome}>
              Back to home
            </Button>
          </div>
        ) : (
          <>
            <VideoPlayer
              stream={remoteStream}
              muted={muted}
              className="w-full h-full min-h-[320px]"
              aria-label="Shared tab stream"
            />
            <div className="absolute bottom-3 left-3">
              <Button
                variant="secondary"
                onClick={() => setMuted((m) => !m)}
                title={muted ? "Turn on tab audio" : "Mute tab audio"}
              >
                {muted ? "🔇 Unmute tab audio" : "🔊 Tab audio on"}
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="mt-4">
        <Controls>
          <span className="text-sm text-zinc-500">
            Status: {webrtcState} · Socket: {socketStatus}
          </span>
        </Controls>
      </div>
    </main>
  );
}

export default function ViewPage() {
  return <ViewPageContent />;
}
