'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRoomStore } from '@/store/roomStore';
import { getSocket } from '@/lib/socket';
import { SocketEvent } from '@codeforge/shared-types';
import AiFeedbackPanel from '../ai-feedback/AiFeedbackPanel';

interface SubmitPanelProps {
  code: string;
  language: string;
  problemId?: string;
  contestId?: string;
}

type Status = 'idle' | 'submitting' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface SubmissionHistory {
  id: string;
  status: Status;
  verdict: string | null;
  language: string;
  executionTimeMs: number | null;
  createdAt: string;
  stdout: string | null;
  stderr: string | null;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';
}

export default function SubmitPanel({ code, language, problemId, contestId }: SubmitPanelProps) {
  const roomId = useRoomStore((s) => s.roomId);
  const [status, setStatus] = useState<Status>('idle');
  const [history, setHistory] = useState<SubmissionHistory[]>([]);
  const [activeSubmission, setActiveSubmission] = useState<SubmissionHistory | null>(null);
  const [error, setError] = useState('');

  // Fetch history on mount
  useEffect(() => {
    if (!roomId) return;
    fetch(`${API}/api/rooms/${roomId}/submissions`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.submissions) {
          setHistory(data.submissions);
          if (data.submissions.length > 0) {
            setActiveSubmission(data.submissions[0]);
          }
        }
      })
      .catch((err) => console.error('Failed to load history', err));
  }, [roomId]);

  // Socket Listeners for Realtime Updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleUpdate = (payload: any) => {
      setHistory((prev) => {
        const index = prev.findIndex((s) => s.id === payload.id);
        if (index > -1) {
          const newHistory = [...prev];
          newHistory[index] = payload;
          return newHistory;
        } else {
          return [payload, ...prev];
        }
      });

      setActiveSubmission((prev) => {
        if (prev?.id === payload.id) return payload;
        return prev;
      });

      // Update global status if this is our active run
      if (status !== 'idle' && status !== 'COMPLETED' && status !== 'FAILED') {
        setStatus(payload.status);
        if (payload.status === 'COMPLETED' || payload.status === 'FAILED') {
          setTimeout(() => setStatus('idle'), 2000); // return to idle after 2s
        }
      }
    };

    socket.on(SocketEvent.SUBMISSION_QUEUED, handleUpdate);
    socket.on(SocketEvent.SUBMISSION_PROCESSING, handleUpdate);
    socket.on(SocketEvent.SUBMISSION_COMPLETED, handleUpdate);
    socket.on(SocketEvent.SUBMISSION_FAILED, handleUpdate);

    return () => {
      socket.off(SocketEvent.SUBMISSION_QUEUED, handleUpdate);
      socket.off(SocketEvent.SUBMISSION_PROCESSING, handleUpdate);
      socket.off(SocketEvent.SUBMISSION_COMPLETED, handleUpdate);
      socket.off(SocketEvent.SUBMISSION_FAILED, handleUpdate);
    };
  }, [status]);

  async function handleSubmit() {
    if (!code.trim() || !roomId) return;

    setStatus('submitting');
    setError('');

    try {
      const res = await fetch(`${API}/api/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ language, sourceCode: code, roomId, problemId, contestId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Submit failed (${res.status})`);
        setStatus('idle');
        return;
      }
      
      const data = await res.json();
      setActiveSubmission(data.submission);
      setHistory((prev) => [data.submission, ...prev]);
      setStatus('PENDING');

    } catch {
      setError('Network error');
      setStatus('idle');
    }
  }

  const isRunning = status === 'submitting' || status === 'PENDING' || status === 'PROCESSING';

  return (
    <div className="submit-panel">
      <div className="submit-toolbar">
        <button className="btn-run" onClick={handleSubmit} disabled={isRunning || !roomId}>
          {isRunning ? (
            <>
              <span className="spinner" />
              {status === 'submitting' ? 'Submitting...' : status === 'PENDING' ? 'Queued...' : 'Executing...'}
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Run Code
            </>
          )}
        </button>
      </div>

      {error && <div className="output-error">{error}</div>}

      <div className="history-container">
        {/* Active/Selected Run Details */}
        {activeSubmission && (
          <div className="output-panel">
            <div className="output-header">
              <span className={`verdict-badge ${activeSubmission.status === 'COMPLETED' ? 'verdict-success' : activeSubmission.status === 'FAILED' ? 'verdict-fail' : ''}`}>
                {activeSubmission.verdict || activeSubmission.status}
              </span>
              {activeSubmission.executionTimeMs != null && (
                <span className="exec-time">{activeSubmission.executionTimeMs}ms</span>
              )}
            </div>

            {activeSubmission.stdout && (
              <div className="output-section">
                <div className="output-label">stdout</div>
                <pre className="output-code">{activeSubmission.stdout}</pre>
              </div>
            )}
            {activeSubmission.stderr && (
              <div className="output-section">
                <div className="output-label output-label-err">stderr</div>
                <pre className="output-code output-code-err">{activeSubmission.stderr}</pre>
              </div>
            )}

            {(activeSubmission.status === 'COMPLETED' || activeSubmission.status === 'FAILED') && (
              <div style={{ marginTop: '24px' }}>
                <AiFeedbackPanel submissionId={activeSubmission.id} />
              </div>
            )}
          </div>
        )}

        {/* History Table */}
        {history.length > 0 && (
          <div className="history-list">
            <h4>Recent Runs</h4>
            <div className="history-table">
              {history.map((sub) => (
                <div 
                  key={sub.id} 
                  className={`history-row ${activeSubmission?.id === sub.id ? 'active' : ''}`}
                  onClick={() => setActiveSubmission(sub)}
                >
                  <div className="history-col-verdict">
                    <span className={`status-dot ${sub.status.toLowerCase()}`}></span>
                    {sub.verdict || sub.status}
                  </div>
                  <div className="history-col-lang">{sub.language}</div>
                  <div className="history-col-time">{sub.executionTimeMs ? `${sub.executionTimeMs}ms` : '-'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
