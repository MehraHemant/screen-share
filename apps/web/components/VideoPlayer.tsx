"use client";

import { useRef, useEffect } from "react";

interface VideoPlayerProps {
  stream: MediaStream | null;
  muted?: boolean;
  autoPlay?: boolean;
  playsInline?: boolean;
  className?: string;
  /** Optional label for the video (e.g. for accessibility when used with controls) */
  "aria-label"?: string;
}

export function VideoPlayer({
  stream,
  muted = false,
  autoPlay = true,
  playsInline = true,
  className = "",
  "aria-label": ariaLabel,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay={autoPlay}
      playsInline={playsInline}
      muted={muted}
      className={`w-full h-full object-contain bg-black rounded-lg ${className}`}
      aria-label={ariaLabel}
    />
  );
}
