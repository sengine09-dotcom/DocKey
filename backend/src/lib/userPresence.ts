const USER_PRESENCE_WINDOW_MS = 30 * 1000;

type UserPresenceState = {
  lastHeartbeatAt: number;
  disconnectedAt: number | null;
};

const userPresence = new Map<string, UserPresenceState>();

export const markUserHeartbeat = (userId: string) => {
  if (!userId) {
    return;
  }

  userPresence.set(userId, {
    lastHeartbeatAt: Date.now(),
    disconnectedAt: null,
  });
};

export const markUserDisconnected = (userId: string) => {
  if (!userId) {
    return;
  }

  const current = userPresence.get(userId);
  userPresence.set(userId, {
    lastHeartbeatAt: current?.lastHeartbeatAt || 0,
    disconnectedAt: Date.now(),
  });
};

export const getUserPresence = (userId: string) => {
  const current = userPresence.get(userId);
  if (!current) {
    return { online: false, lastSeenAt: null as string | null };
  }

  const online =
    current.lastHeartbeatAt > 0 &&
    (!current.disconnectedAt || current.lastHeartbeatAt > current.disconnectedAt) &&
    Date.now() - current.lastHeartbeatAt <= USER_PRESENCE_WINDOW_MS;

  return {
    online,
    lastSeenAt: current.lastHeartbeatAt ? new Date(current.lastHeartbeatAt).toISOString() : null,
  };
};