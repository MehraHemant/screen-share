"use client";

import { useCallback, useRef, useEffect } from "react";
import {
  createPeerConnection,
  createOffer,
  setLocalDescription,
  setRemoteDescription,
  addIceCandidate,
  closePeerConnection,
} from "@/lib/webrtc";
import type { SignalingSocket } from "@/lib/socket";

export function useViewerMicSend(
  socket: SignalingSocket | null,
  sharerId: string | null,
  micStream: MediaStream | null
) {
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const startSending = useCallback(async () => {
    if (!socket || !sharerId || !micStream) return;
    if (pcRef.current) return;
    const pc = createPeerConnection();
    pcRef.current = pc;
    micStream.getTracks().forEach((track) => pc.addTrack(track, micStream));
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("viewer-mic-ice", { to: sharerId, candidate: e.candidate });
    };
    const offer = await createOffer(pc);
    await setLocalDescription(pc, offer);
    socket.emit("viewer-mic-offer", { to: sharerId, sdp: offer });
  }, [socket, sharerId, micStream]);

  useEffect(() => {
    if (!socket || !sharerId) return;
    const handleAnswer = async (payload: { from: string; sdp: RTCSessionDescriptionInit }) => {
      if (payload.from !== sharerId) return;
      const pc = pcRef.current;
      if (!pc) return;
      await setRemoteDescription(pc, payload.sdp);
    };
    const handleIce = async (payload: { from: string; candidate: RTCIceCandidateInit }) => {
      if (payload.from !== sharerId) return;
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await addIceCandidate(pc, payload.candidate);
      } catch {
        // ignore
      }
    };
    socket.on("viewer-mic-answer", handleAnswer);
    socket.on("viewer-mic-ice", handleIce);
    return () => {
      socket.off("viewer-mic-answer", handleAnswer);
      socket.off("viewer-mic-ice", handleIce);
    };
  }, [socket, sharerId]);

  useEffect(() => {
    if (micStream && sharerId && socket) startSending();
    return () => {
      if (pcRef.current) {
        closePeerConnection(pcRef.current);
        pcRef.current = null;
      }
    };
  }, [micStream, sharerId, socket, startSending]);

  return { startSending };
}
