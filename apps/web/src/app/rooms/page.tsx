'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';

interface Room {
  id: string;
  title: string;
  createdAt: string;
  host: { username: string };
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function RoomsPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuthStore();
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const fetchRooms = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRooms(data.rooms ?? []);
    } catch {
      setError('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    } else if (isAuthenticated) {
      fetchRooms();
    }
  }, [authLoading, isAuthenticated, router, fetchRooms]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !token) return;
    setCreating(true);
    setError('');

    try {
      const res = await fetch(`${API}/api/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: title.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to create room');
        return;
      }

      const data = await res.json();
      router.push(`/rooms/${data.room.id}`);
    } catch {
      setError('Network error');
    } finally {
      setCreating(false);
    }
  }

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return <div className="rooms-loading"><div className="room-skeleton" /></div>;
  }

  return (
    <div className="rooms-page">
      <div className="rooms-hero">
        <div className="hero-badge">CodeForge</div>
        <h1 className="hero-title">Interview Rooms</h1>
        <p className="hero-sub">Collaborative coding environments for technical interviews</p>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Room
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Create Interview Room</h2>
            <form onSubmit={handleCreate} className="modal-form">
              <label className="form-label">Room Title</label>
              <input
                className="form-input"
                placeholder="e.g. Frontend Interview — Round 2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
              {error && <p className="form-error">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? 'Creating…' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="rooms-grid-section">
        {loading ? (
          <div className="rooms-loading">
            {[1, 2, 3].map((i) => (
              <div key={i} className="room-skeleton" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="rooms-empty">
            <div className="empty-icon">⬡</div>
            <p>No rooms yet. Create your first interview room.</p>
          </div>
        ) : (
          <div className="rooms-grid">
            {rooms.map((room) => (
              <button
                key={room.id}
                className="room-card"
                onClick={() => router.push(`/rooms/${room.id}`)}
              >
                <div className="room-card-top">
                  <div className="room-card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                  </div>
                  <span className="room-card-id">#{room.id.slice(0, 6)}</span>
                </div>
                <h3 className="room-card-title">{room.title}</h3>
                <p className="room-card-meta">
                  {new Date(room.createdAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </p>
                <div className="room-card-footer">
                  <span className="room-card-join">Open Room →</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
