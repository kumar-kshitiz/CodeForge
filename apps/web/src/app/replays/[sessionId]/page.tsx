'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReplayEngine, SessionEvent } from '../../../hooks/useReplayEngine';
import ReplayEditor from '../../../components/replay/ReplayEditor';
import TimelineControls from '../../../components/replay/TimelineControls';
import SessionAnalytics from '../../../components/replay/SessionAnalytics';
import { useAuthStore } from '../../../store/authStore';

export default function ReplayPage() {
  const { sessionId } = useParams();
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuthStore();
  
  const [session, setSession] = useState<any>(null);
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      router.push('/login');
      return;
    }

    if (!token) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/replays/session/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.session && data.events) {
          setSession(data.session);
          setEvents(data.events);
        }
      })
      .catch(err => console.error('Failed to load replay', err))
      .finally(() => setIsLoading(false));
  }, [sessionId, token, isAuthenticated, authLoading, router]);

  const {
    isPlaying, togglePlay, playbackSpeed, setPlaybackSpeed, 
    currentTime, duration, scrub, replayState
  } = useReplayEngine(events, session?.startedAt || new Date().toISOString());

  if (authLoading || isLoading) {
    return <div className="loading-state">Loading replay...</div>;
  }

  if (!session) {
    return <div className="error-state">Session not found or no access</div>;
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      {/* Left Panel */}
      <div style={{ width: '320px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Interview Replay</h2>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Started: {new Date(session.startedAt).toLocaleString()}
          </div>
        </div>

        <SessionAnalytics events={events} session={session} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <h3 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>Event Log</h3>
          {events.length === 0 && <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No events recorded.</div>}
          {events.slice(-50).map((e, idx) => (
            <div key={e.id} style={{ fontSize: '12px', padding: '4px 0', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--primary)', marginRight: '8px' }}>
                {new Date(e.createdAt).toLocaleTimeString()}
              </span>
              {e.eventType}
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '8px 16px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            <strong>Language:</strong> {replayState.language}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            <strong>Participants:</strong> {Array.from(replayState.participants.values()).map(p => p.username).join(', ') || 'None'}
          </div>
        </div>

        <ReplayEditor code={replayState.code} language={replayState.language} />
        
        <TimelineControls
          isPlaying={isPlaying}
          togglePlay={togglePlay}
          playbackSpeed={playbackSpeed}
          setPlaybackSpeed={setPlaybackSpeed}
          currentTime={currentTime}
          duration={duration}
          scrub={scrub}
        />
      </div>
    </div>
  );
}
