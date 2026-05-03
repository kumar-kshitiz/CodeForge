'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  tags: { name: string }[];
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/problems`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.problems) {
          setProblems(data.problems);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <div className="header-actions">
        <h1>Coding Problems</h1>
        <p className="text-muted">Solve problems, improve your skills, and prepare for interviews.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading problems...</div>
      ) : (
        <div className="problems-table-container">
          <table className="problems-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Title</th>
                <th>Difficulty</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((prob) => (
                <tr key={prob.id}>
                  <td className="col-status">
                    {/* Placeholder for status (solved/unsolved) */}
                    <span className="status-dot pending"></span>
                  </td>
                  <td className="col-title">
                    <Link href={`/problems/${prob.slug}`} className="problem-link">
                      {prob.title}
                    </Link>
                  </td>
                  <td className={`col-diff diff-${prob.difficulty.toLowerCase()}`}>
                    {prob.difficulty}
                  </td>
                  <td className="col-tags">
                    {prob.tags.map(t => t.name).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
