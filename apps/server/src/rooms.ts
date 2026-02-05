/**
 * Room state for signaling.
 * One room per session ID. One sharer, many viewers.
 */

export type PeerRole = "sharer" | "viewer";

export interface RoomPeer {
  id: string;
  role: PeerRole;
  joinedAt: number;
}

export interface Room {
  sessionId: string;
  sharerId: string | null;
  viewers: Map<string, RoomPeer>;
  createdAt: number;
}

const rooms = new Map<string, Room>();

const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]{8,64}$/;
const INACTIVE_ROOM_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000;   // 1 minute

/**
 * Validate session ID format (alphanumeric, underscore, hyphen, 8–64 chars).
 */
export function isValidSessionId(sessionId: string): boolean {
  return typeof sessionId === "string" && SESSION_ID_REGEX.test(sessionId);
}

/**
 * Get or create a room for the given session ID.
 */
export function getOrCreateRoom(sessionId: string): Room {
  let room = rooms.get(sessionId);
  if (!room) {
    room = {
      sessionId,
      sharerId: null,
      viewers: new Map(),
      createdAt: Date.now(),
    };
    rooms.set(sessionId, room);
  }
  return room;
}

/**
 * Get room by session ID (may be undefined).
 */
export function getRoom(sessionId: string): Room | undefined {
  return rooms.get(sessionId);
}

/**
 * Try to set the sharer for a room. Fails if room already has a sharer.
 */
export function setSharer(sessionId: string, socketId: string): boolean {
  const room = getOrCreateRoom(sessionId);
  if (room.sharerId !== null) {
    return false; // Already has a sharer
  }
  room.sharerId = socketId;
  room.viewers.set(socketId, {
    id: socketId,
    role: "sharer",
    joinedAt: Date.now(),
  });
  return true;
}

/**
 * Remove sharer from room. Returns true if removed.
 */
export function removeSharer(sessionId: string, socketId: string): boolean {
  const room = rooms.get(sessionId);
  if (!room || room.sharerId !== socketId) return false;
  room.sharerId = null;
  room.viewers.delete(socketId);
  return true;
}

/**
 * Add viewer to room. Returns true if added.
 */
export function addViewer(sessionId: string, socketId: string): boolean {
  const room = getOrCreateRoom(sessionId);
  if (room.viewers.has(socketId)) return false;
  room.viewers.set(socketId, {
    id: socketId,
    role: "viewer",
    joinedAt: Date.now(),
  });
  return true;
}

/**
 * Remove viewer from room.
 */
export function removeViewer(sessionId: string, socketId: string): void {
  const room = rooms.get(sessionId);
  if (!room) return;
  room.viewers.delete(socketId);
  if (room.sharerId === null && room.viewers.size === 0) {
    rooms.delete(sessionId);
  }
}

/**
 * Get viewer count (excluding sharer).
 */
export function getViewerCount(sessionId: string): number {
  const room = rooms.get(sessionId);
  if (!room) return 0;
  let count = 0;
  for (const p of room.viewers.values()) {
    if (p.role === "viewer") count++;
  }
  return count;
}

/**
 * Get all viewer socket IDs (excluding sharer).
 */
export function getViewerIds(sessionId: string): string[] {
  const room = rooms.get(sessionId);
  if (!room) return [];
  const ids: string[] = [];
  for (const p of room.viewers.values()) {
    if (p.role === "viewer") ids.push(p.id);
  }
  return ids;
}

/**
 * Check if room has a sharer.
 */
export function hasSharer(sessionId: string): boolean {
  const room = rooms.get(sessionId);
  return !!room?.sharerId;
}

/**
 * Clean up rooms that have been inactive for too long.
 */
function cleanupInactiveRooms(): void {
  const now = Date.now();
  for (const [sessionId, room] of rooms.entries()) {
    const lastActivity = room.sharerId
      ? now
      : Array.from(room.viewers.values()).reduce(
          (t, p) => Math.max(t, p.joinedAt),
          room.createdAt
        );
    if (now - lastActivity > INACTIVE_ROOM_MS) {
      rooms.delete(sessionId);
    }
  }
}

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function startRoomCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(cleanupInactiveRooms, CLEANUP_INTERVAL_MS);
}

export function stopRoomCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
