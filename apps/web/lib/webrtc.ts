const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function createPeerConnection(config?: RTCConfiguration): RTCPeerConnection {
  return new RTCPeerConnection({
    iceServers: config?.iceServers ?? STUN_SERVERS,
    iceCandidatePoolSize: 10,
    ...config,
  });
}

export function createOffer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
  return pc.createOffer();
}

export function createAnswer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
  return pc.createAnswer();
}

export async function setLocalDescription(
  pc: RTCPeerConnection,
  desc: RTCSessionDescriptionInit
): Promise<void> {
  await pc.setLocalDescription(desc);
}

export async function setRemoteDescription(
  pc: RTCPeerConnection,
  desc: RTCSessionDescriptionInit
): Promise<void> {
  await pc.setRemoteDescription(new RTCSessionDescription(desc));
}

export function addIceCandidate(
  pc: RTCPeerConnection,
  candidate: RTCIceCandidateInit
): Promise<void> {
  return pc.addIceCandidate(new RTCIceCandidate(candidate));
}

export function getTransceivers(pc: RTCPeerConnection): RTCRtpTransceiver[] {
  return pc.getTransceivers();
}

export function closePeerConnection(pc: RTCPeerConnection | null): void {
  if (!pc) return;
  pc.getSenders().forEach((s) => s.track?.stop());
  pc.getReceivers().forEach((r) => r.track?.stop());
  pc.close();
}
