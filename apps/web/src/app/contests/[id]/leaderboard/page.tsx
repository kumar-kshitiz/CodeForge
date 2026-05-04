'use client';

import { useState, useEffect, use } from 'react';
import { getSocket } from '@/lib/socket';
import { SocketEvent } from '@codeforge/shared-types';
import Link from 'next/link';

interface LeaderboardEntry {
  id: string;
  userId: string;
  score: number;
  penalty: number;
  updatedAt: string;
  user: { username: string };
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('accessToken') ?? '' : '';
}

export default function LeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/contests/${id}/leaderboard`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.leaderboard) setLeaderboard(data.leaderboard);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Join a specific contest room to listen for leaderboard updates
    const roomName = `contest-${id}`;
    socket.emit(SocketEvent.JOIN_ROOM, { roomId: roomName });

    const handleUpdate = (updatedParticipant: LeaderboardEntry) => {
      setLeaderboard((prev) => {
        let newList = [...prev];
        const idx = newList.findIndex(p => p.id === updatedParticipant.id);
        
        if (idx > -1) {
          newList[idx] = updatedParticipant;
        } else {
          newList.push(updatedParticipant);
        }

        // Re-sort the leaderboard instantly
        return newList.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (a.penalty !== b.penalty) return a.penalty - b.penalty;
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        });
      });
    };

    socket.on(SocketEvent.CONTEST_LEADERBOARD_UPDATE, handleUpdate);

    return () => {
      socket.off(SocketEvent.CONTEST_LEADERBOARD_UPDATE, handleUpdate);
      socket.emit(SocketEvent.LEAVE_ROOM, { roomId: roomName });
    };
  }, [id]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Leaderboard...</div>;

  return (
    <div className="container">
      <div className="header-actions">
        <div>
          <Link href={`/contests/${id}`} className="back-link">← Back to Contest</Link>
          <h1 style={{ marginTop: '12px' }}>Live Leaderboard</h1>
        </div>
      </div>

      <div className="problems-table-container">
        <table className="problems-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Username</th>
              <th>Score</th>
              <th>Penalty (mins)</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '32px' }}>No participants yet.</td>
              </tr>
            ) : (
              leaderboard.map((entry, idx) => (
                <tr key={entry.id} style={{ transition: 'all 0.3s ease-in-out' }}>
                  <td style={{ fontWeight: 600 }}>{idx + 1}</td>
                  <td className="col-title" style={{ fontWeight: 600 }}>{entry.user.username}</td>
                  <td style={{ color: 'var(--green)', fontWeight: 'bold' }}>{entry.score}</td>
                  <td style={{ color: 'var(--red)', fontFamily: 'monospace' }}>{entry.penalty}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
