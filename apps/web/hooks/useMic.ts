"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export function useMic() {
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  const startMic = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicStream(stream);
      setIsMuted(false);
      return stream;
    } catch {
      return null;
    }
  }, []);

  const stopMic = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMicStream(null);
    setIsMuted(true);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    streamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
    setIsMuted(muted);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      streamRef.current?.getAudioTracks().forEach((t) => {
        t.enabled = next;
      });
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    micStream,
    isMuted,
    startMic,
    stopMic,
    setMuted,
    toggleMute,
  };
}
