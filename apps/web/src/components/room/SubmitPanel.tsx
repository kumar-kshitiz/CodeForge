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
  passedTestCases?: number | null;
  totalTestCases?: number | null;
  failedTestCase?: { input: string; expected: string; actual: string } | null;
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
    const token = getToken();
    const username = typeof window !== 'undefined' ? localStorage.getItem('username') || 'Anonymous' : 'Anonymous';
    const socket = getSocket(token, username);
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
    if (!code.trim()) return;

    setStatus('submitting');
    setError('');

    try {
      // Fake rooms start with 'problem-' and aren't in the DB.
      // We omit them so Prisma doesn't throw a foreign key constraint error.
      const dbRoomId = roomId?.startsWith('problem-') ? undefined : roomId;

      const res = await fetch(`${API}/api/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        // roomId is optional — null is fine for solo problem workspace
        body: JSON.stringify({ language, sourceCode: code, roomId: dbRoomId, problemId, contestId }),
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

      // Poll for result if no socket feedback arrives within 15s
      pollSubmissionStatus(data.submission.id);

    } catch {
      setError('Network error — is the API server running?');
      setStatus('idle');
    }
  }

  async function pollSubmissionStatus(submissionId: string) {
    const maxAttempts = 30; // 30 × 1s = 30s max
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`${API}/api/submissions/${submissionId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        const sub = data.submission;
        if (sub && (sub.status === 'COMPLETED' || sub.status === 'FAILED')) {
          clearInterval(interval);
          setActiveSubmission(sub);
          setHistory((prev) => {
            const index = prev.findIndex((s) => s.id === sub.id);
            if (index > -1) {
              const newHistory = [...prev];
              newHistory[index] = sub;
              return newHistory;
            }
            return [sub, ...prev];
          });
          setStatus('idle');
        }
      } catch { /* ignore poll errors */ }
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setStatus('idle');
        setError('Execution timed out. Please try again.');
      }
    }, 1000);
  }

  const isRunning = status === 'submitting' || status === 'PENDING' || status === 'PROCESSING';

  return (
    <div className="submit-panel">
      <div className="submit-toolbar">
        <button className="btn-run" onClick={handleSubmit} disabled={isRunning}>
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
              {activeSubmission.totalTestCases != null && activeSubmission.totalTestCases > 0 && (
                <span className="testcase-ratio">
                  Passed {activeSubmission.passedTestCases} / {activeSubmission.totalTestCases}
                </span>
              )}
            </div>

            {activeSubmission.failedTestCase && (
              <div className="failed-testcase-container">
                <div className="failed-testcase-title">Testcase Failed</div>
                <div className="testcase-row">
                  <div className="testcase-label">Input</div>
                  <pre className="testcase-value">{activeSubmission.failedTestCase.input}</pre>
                </div>
                <div className="testcase-row">
                  <div className="testcase-label">Expected Output</div>
                  <pre className="testcase-value testcase-expected">{activeSubmission.failedTestCase.expected}</pre>
                </div>
                <div className="testcase-row">
                  <div className="testcase-label">Actual Output</div>
                  <pre className="testcase-value testcase-actual">{activeSubmission.failedTestCase.actual}</pre>
                </div>
              </div>
            )}

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
                <AiFeedbackPanel
                  submissionId={activeSubmission.id}
                  verdict={activeSubmission.verdict ?? undefined}
                />
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
                  <div className="history-col-time">
                    {sub.executionTimeMs ? `${sub.executionTimeMs}ms` : '-'}
                  </div>
                  <div className="history-col-testcases">
                    {sub.totalTestCases ? `${sub.passedTestCases}/${sub.totalTestCases}` : '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
