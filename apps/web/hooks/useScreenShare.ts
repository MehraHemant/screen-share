"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export type ScreenShareState = "idle" | "requesting" | "active" | "error" | "stopped";

const DISPLAY_MEDIA_OPTIONS: DisplayMediaStreamOptions = {
  video: {
    displaySurface: "browser",
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
  },
  audio: true,
};

export function useScreenShare() {
  const [state, setState] = useState<ScreenShareState>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopSharing = useCallback(() => {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStream(null);
    }
    setState("stopped");
    setError(null);
  }, []);

  const startSharing = useCallback(async (): Promise<MediaStream | null> => {
    setError(null);
    setState("requesting");
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia(DISPLAY_MEDIA_OPTIONS);
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setState("active");

      mediaStream.getVideoTracks()[0]?.addEventListener(
        "ended",
        () => {
          stopSharing();
        },
        { once: true }
      );

      return mediaStream;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to share screen";
      setError(message);
      setState("error");
      return null;
    }
  }, [stopSharing]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  return {
    state,
    stream,
    error,
    startSharing,
    stopSharing,
  };
}
