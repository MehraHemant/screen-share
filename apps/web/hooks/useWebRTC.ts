"use client";

import { useCallback, useRef, useEffect } from "react";
import {
  createPeerConnection,
  createOffer,
  createAnswer,
  setLocalDescription,
  setRemoteDescription,
  addIceCandidate,
  closePeerConnection,
} from "@/lib/webrtc";
import type { SignalingSocket } from "@/lib/socket";

export type WebRTCState = "idle" | "connecting" | "connected" | "failed" | "closed";

interface UseWebRTCSharerOptions {
  socket: SignalingSocket | null;
  sessionId: string;
  stream: MediaStream | null;
  onViewerCount?: (count: number) => void;
}

export function useWebRTCSharer({
  socket,
  sessionId,
  stream,
  onViewerCount,
}: UseWebRTCSharerOptions) {
  const pcMapRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const streamRef = useRef<MediaStream | null>(null);

  streamRef.current = stream;

  const createPeerForViewer = useCallback(
    async (viewerId: string) => {
      if (!socket || !streamRef.current) return;
      const pc = createPeerConnection();
      pcMapRef.current.set(viewerId, pc);

      streamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, streamRef.current!);
      });

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("ice-candidate", { to: viewerId, candidate: e.candidate });
        }
      };

      const offer = await createOffer(pc);
      await setLocalDescription(pc, offer);
      socket.emit("offer", { to: viewerId, sdp: offer });
    },
    [socket]
  );

  useEffect(() => {
    if (!socket || !sessionId) return;

    const handleAnswer = async (payload: { from: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = pcMapRef.current.get(payload.from);
      if (!pc) return;
      await setRemoteDescription(pc, payload.sdp);
    };

    const handleIceCandidate = async (payload: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = pcMapRef.current.get(payload.from);
      if (!pc) return;
      try {
        await addIceCandidate(pc, payload.candidate);
      } catch {
        // Ignore duplicate or late candidates
      }
    };

    const handleViewerJoined = (payload: { viewerId: string; viewerCount: number }) => {
      createPeerForViewer(payload.viewerId);
      onViewerCount?.(payload.viewerCount);
    };

    const handleViewerLeft = (payload: { viewerCount: number }) => {
      onViewerCount?.(payload.viewerCount);
    };

    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("viewer-joined", handleViewerJoined);
    socket.on("viewer-left", handleViewerLeft);

    return () => {
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("viewer-joined", handleViewerJoined);
      socket.off("viewer-left", handleViewerLeft);
    };
  }, [socket, sessionId, createPeerForViewer, onViewerCount]);

  useEffect(() => {
    return () => {
      pcMapRef.current.forEach((pc) => closePeerConnection(pc));
      pcMapRef.current.clear();
    };
  }, []);

  return { peerCount: pcMapRef.current.size };
}

interface UseWebRTCViewerOptions {
  socket: SignalingSocket | null;
  sessionId: string;
  onStream?: (stream: MediaStream) => void;
  onStateChange?: (state: WebRTCState) => void;
}

export function useWebRTCViewer({
  socket,
  sessionId,
  onStream,
  onStateChange,
}: UseWebRTCViewerOptions) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sharerIdRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      closePeerConnection(pcRef.current);
      pcRef.current = null;
    }
    sharerIdRef.current = null;
    onStateChange?.("closed");
  }, [onStateChange]);

  useEffect(() => {
    if (!socket || !sessionId) return;

    const handleOffer = async (payload: { from: string; sdp: RTCSessionDescriptionInit }) => {
      if (pcRef.current) {
        closePeerConnection(pcRef.current);
      }
      sharerIdRef.current = payload.from;
      onStateChange?.("connecting");

      const pc = createPeerConnection();
      pcRef.current = pc;

      pc.ontrack = (e) => {
        if (e.streams[0]) {
          onStream?.(e.streams[0]);
          onStateChange?.("connected");
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          onStateChange?.("failed");
        }
        if (pc.connectionState === "closed") {
          cleanup();
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && sharerIdRef.current) {
          socket.emit("ice-candidate", {
            to: sharerIdRef.current,
            candidate: e.candidate,
          });
        }
      };

      await setRemoteDescription(pc, payload.sdp);
      const answer = await createAnswer(pc);
      await setLocalDescription(pc, answer);
      socket.emit("answer", { to: payload.from, sdp: answer });
    };

    const handleIceCandidate = async (payload: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = pcRef.current;
      if (!pc || payload.from !== sharerIdRef.current) return;
      try {
        await addIceCandidate(pc, payload.candidate);
      } catch {
        // Ignore
      }
    };

    const handleSharerLeft = () => {
      cleanup();
    };

    socket.on("offer", handleOffer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("sharer-left", handleSharerLeft);

    return () => {
      socket.off("offer", handleOffer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("sharer-left", handleSharerLeft);
      cleanup();
    };
  }, [socket, sessionId, onStream, onStateChange, cleanup]);

  return { cleanup };
}
