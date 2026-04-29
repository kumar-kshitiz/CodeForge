'use client';

import { useRoomStore } from '../../store/roomStore';

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
];

export default function PresenceBar() {
  const { participants, connected } = useRoomStore();

  return (
    <div className="presence-bar">
      <div className="presence-status">
        <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
        <span className="status-label">{connected ? 'Live' : 'Reconnecting…'}</span>
      </div>
      <div className="avatars">
        {participants.map((p, i) => (
          <div
            key={p.socketId}
            className="avatar"
            style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
            title={p.username}
          >
            {p.username.slice(0, 2).toUpperCase()}
          </div>
        ))}
      </div>
      <span className="participant-count">
        {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
      </span>
    </div>
  );
}
