"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Controls, Button } from "@/components/Controls";
import { ChatPanel } from "@/components/ChatPanel";
import { useSocket } from "@/hooks/useSocket";
import { useWebRTCViewer, type WebRTCState } from "@/hooks/useWebRTC";
import { useViewerMicSend } from "@/hooks/useViewerMicSend";
import { useMic } from "@/hooks/useMic";
import { useChat } from "@/hooks/useChat";

function ViewPageContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : "";

  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [webrtcState, setWebrtcState] = useState<WebRTCState>("idle");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [tabAudioMuted, setTabAudioMuted] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(async () => {
    const el = videoContainerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen not supported or denied
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const { getSocket, status: socketStatus, joinRoom } = useSocket();
  const socket = getSocket();
  const { messages, send: sendChat } = useChat(socket ?? null, sessionId);
  const { micStream, isMuted: micMuted, startMic, toggleMute: toggleMicMute } = useMic();

  const { sharerId } = useWebRTCViewer({
    socket: socket ?? null,
    sessionId,
    onStream: setRemoteStream,
    onStateChange: setWebrtcState,
  });

  useViewerMicSend(socket ?? null, sharerId, micStream);

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

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          ref={videoContainerRef}
          className="lg:col-span-2 flex flex-col min-h-0 rounded-xl overflow-hidden bg-black border border-white/10 relative"
        >
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
                muted={tabAudioMuted}
                className="w-full h-full min-h-[320px]"
                aria-label="Shared tab stream"
              />
              <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setTabAudioMuted((m) => !m)}
                  title={tabAudioMuted ? "Hear screen + host voice" : "Mute screen sound"}
                >
                  {tabAudioMuted ? "🔇 Unmute screen sound" : "🔊 Screen sound on"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={toggleFullscreen}
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? "⛶ Exit fullscreen" : "⛶ Fullscreen"}
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col min-h-0 gap-2">
          <div className="flex flex-wrap gap-2">
            {webrtcState === "connected" && (
              <>
                {!micStream ? (
                  <Button variant="secondary" onClick={() => startMic()}>
                    🎤 Turn on mic
                  </Button>
                ) : (
                  <Button
                    variant={micMuted ? "secondary" : "primary"}
                    onClick={toggleMicMute}
                    title={micMuted ? "Unmute mic" : "Mute mic"}
                  >
                    {micMuted ? "🔇 Mic muted" : "🔊 Mic on"}
                  </Button>
                )}
              </>
            )}
          </div>
          <ChatPanel
            messages={messages}
            onSend={sendChat}
            myRole="viewer"
            isOpen={chatOpen}
            onToggle={() => setChatOpen((o) => !o)}
          />
        </div>
      </div>

      <div className="mt-2 text-sm text-zinc-500">
        Status: {webrtcState} · Socket: {socketStatus}
      </div>
    </main>
  );
}

export default function ViewPage() {
  return <ViewPageContent />;
}
