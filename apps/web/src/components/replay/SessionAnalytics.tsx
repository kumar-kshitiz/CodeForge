import React from 'react';
import { SessionEvent } from '../../hooks/useReplayEngine';
import { SocketEvent } from '@codeforge/shared-types';

interface SessionAnalyticsProps {
  events: SessionEvent[];
  session: any;
}

export default function SessionAnalytics({ events, session }: SessionAnalyticsProps) {
  const codeChanges = events.filter(e => e.eventType === SocketEvent.CODE_CHANGE).length;
  const submissions = events.filter(e => e.eventType === SocketEvent.SUBMISSION_COMPLETED || e.eventType === 'EXECUTION_UPDATE').length;
  const languages = new Set(events.filter(e => e.eventType === SocketEvent.LANGUAGE_CHANGE).map(e => e.payload.language));
  const participants = new Set(events.filter(e => e.eventType === SocketEvent.USER_JOINED).map(e => e.payload.user?.username));

  const totalTimeStr = session.endedAt 
    ? ((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000).toFixed(1) + ' mins'
    : 'Ongoing / Unknown';

  return (
    <div className="session-analytics" style={{ padding: '16px' }}>
      <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Session Analytics</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Edits</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>{codeChanges}</div>
        </div>

        <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Submissions</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>{submissions}</div>
        </div>

        <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Languages</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>{languages.size || 1}</div>
        </div>

        <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Participants</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>{participants.size || 1}</div>
        </div>
      </div>
      
      <div style={{ marginTop: '16px', background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Duration</div>
        <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>{totalTimeStr}</div>
      </div>
    </div>
  );
}
