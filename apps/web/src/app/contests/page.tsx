'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';

interface Contest {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: 'UPCOMING' | 'ACTIVE' | 'PAST';
  _count: { participants: number };
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function ContestsPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!token) return;

    fetch(`${API}/api/contests`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.contests) setContests(data.contests);
      })
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated, token, router]);

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;
  }


  const getStatusColor = (status: string) => {
    if (status === 'ACTIVE') return 'var(--green)';
    if (status === 'UPCOMING') return 'var(--primary)';
    return 'var(--text-muted)';
  };

  return (
    <div className="container">
      <div className="header-actions">
        <h1>Contests</h1>
        <p className="text-muted">Compete against others and improve your ranking.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading contests...</div>
      ) : (
        <div className="contests-grid">
          {contests.map((contest) => (
            <div key={contest.id} className="contest-card">
              <div className="contest-card-header">
                <h3>{contest.title}</h3>
                <span className="badge" style={{ backgroundColor: `${getStatusColor(contest.status)}33`, color: getStatusColor(contest.status) }}>
                  {contest.status}
                </span>
              </div>
              <p className="contest-desc">{contest.description}</p>
              
              <div className="contest-meta">
                <div className="meta-item">
                  <span className="meta-label">Start Time</span>
                  <span>{new Date(contest.startTime).toLocaleString()}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Participants</span>
                  <span>{contest._count.participants}</span>
                </div>
              </div>

              <div className="contest-actions">
                {contest.status === 'ACTIVE' ? (
                  <Link href={`/contests/${contest.id}`} className="btn-primary">Enter Contest</Link>
                ) : contest.status === 'UPCOMING' ? (
                  <button className="btn-secondary" disabled>Starts soon</button>
                ) : (
                  <Link href={`/contests/${contest.id}/leaderboard`} className="btn-secondary">View Leaderboard</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
