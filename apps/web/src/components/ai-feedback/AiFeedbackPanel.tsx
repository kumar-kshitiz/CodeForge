'use client';

import { useState, useEffect } from 'react';

interface AiFeedback {
  id: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  optimizations: string[];
  complexityEstimate: string;
  readabilityScore: number;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function AiFeedbackPanel({ submissionId }: { submissionId: string }) {
  const [feedback, setFeedback] = useState<AiFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchFeedback = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/submissions/${submissionId}/feedback`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch AI feedback');
      const data = await res.json();
      setFeedback(data.feedback);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!feedback && !loading && !error) {
    return (
      <div className="ai-feedback-cta">
        <div className="ai-cta-icon">✨</div>
        <p>Want intelligent code review?</p>
        <button className="btn-primary btn-sm" onClick={fetchFeedback}>
          Generate AI Feedback
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="ai-feedback-loading">
        <span className="spinner"></span>
        <p>AI is analyzing your code...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-feedback-error">
        <p className="text-red-500">{error}</p>
        <button className="btn-secondary btn-sm" onClick={fetchFeedback}>Retry</button>
      </div>
    );
  }

  if (!feedback) return null;

  return (
    <div className="ai-feedback-container">
      <div className="ai-header">
        <h3>✨ AI Code Review</h3>
      </div>

      <p className="ai-summary">{feedback.summary}</p>

      <div className="ai-metrics">
        <div className="metric-box">
          <span className="metric-label">Complexity</span>
          <span className="metric-value">{feedback.complexityEstimate}</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">Readability</span>
          <div className="readability-bar">
            <div 
              className={`bar-fill ${feedback.readabilityScore >= 80 ? 'good' : feedback.readabilityScore >= 50 ? 'avg' : 'poor'}`} 
              style={{ width: `${feedback.readabilityScore}%` }}
            ></div>
            <span className="bar-text">{feedback.readabilityScore}/100</span>
          </div>
        </div>
      </div>

      <div className="ai-grid">
        {feedback.strengths.length > 0 && (
          <div className="ai-card card-strengths">
            <h4>👍 Strengths</h4>
            <ul>
              {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        {feedback.weaknesses.length > 0 && (
          <div className="ai-card card-weaknesses">
            <h4>💡 Needs Improvement</h4>
            <ul>
              {feedback.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {feedback.optimizations.length > 0 && (
          <div className="ai-card card-optimizations" style={{ gridColumn: '1 / -1' }}>
            <h4>🚀 Optimizations</h4>
            <ul>
              {feedback.optimizations.map((o, i) => <li key={i}>{o}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
