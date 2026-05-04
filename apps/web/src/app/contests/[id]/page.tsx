'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface ContestProblem {
  points: number;
  problem: { slug: string; title: string; difficulty: string; };
}

interface Contest {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: 'UPCOMING' | 'ACTIVE' | 'PAST';
  problems: ContestProblem[];
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('accessToken') ?? '' : '';
}

export default function ContestDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [contest, setContest] = useState<Contest | null>(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    fetch(`${API}/api/contests/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.contest) setContest(data.contest);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!contest) return;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(contest.endTime).getTime();
      const start = new Date(contest.startTime).getTime();

      if (now < start) {
        setTimeLeft('Starts in: ' + formatTime(start - now));
      } else if (now < end) {
        setTimeLeft('Ends in: ' + formatTime(end - now));
      } else {
        setTimeLeft('Contest Ended');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [contest]);

  const handleJoin = async () => {
    if (!contest) return;
    try {
      const res = await fetch(`${API}/api/contests/${id}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setJoined(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading contest...</div>;
  if (!contest) return <div style={{ padding: '40px', textAlign: 'center' }}>Contest not found</div>;

  return (
    <div className="container">
      <div className="contest-details-header">
        <Link href="/contests" className="back-link">← All Contests</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <div>
            <h1>{contest.title}</h1>
            <p className="text-muted" style={{ marginTop: '8px' }}>{contest.description}</p>
          </div>
          <div className="contest-timer">
            <span className="timer-text">{timeLeft}</span>
          </div>
        </div>
      </div>

      <div className="contest-action-bar">
        {!joined && contest.status === 'ACTIVE' ? (
          <button className="btn-primary" onClick={handleJoin}>Register & Start</button>
        ) : contest.status === 'ACTIVE' ? (
          <span className="badge" style={{ backgroundColor: 'var(--green-alpha)', color: 'var(--green)' }}>You are participating</span>
        ) : null}

        <Link href={`/contests/${id}/leaderboard`} className="btn-secondary">View Leaderboard</Link>
      </div>

      <div className="problems-table-container">
        <table className="problems-table">
          <thead>
            <tr>
              <th>Points</th>
              <th>Problem Title</th>
              <th>Difficulty</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {contest.problems.map((p) => (
              <tr key={p.problem.slug}>
                <td style={{ fontWeight: 600 }}>{p.points}</td>
                <td className="col-title">{p.problem.title}</td>
                <td className={`col-diff diff-${p.problem.difficulty.toLowerCase()}`}>{p.problem.difficulty}</td>
                <td>
                  {contest.status === 'ACTIVE' && joined ? (
                    <Link href={`/problems/${p.problem.slug}?contestId=${id}`} className="btn-primary" style={{ padding: '6px 12px', fontSize: '13px' }}>Solve</Link>
                  ) : contest.status === 'PAST' ? (
                    <Link href={`/problems/${p.problem.slug}`} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>Practice</Link>
                  ) : (
                    <span className="text-muted text-sm">Unavailable</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
