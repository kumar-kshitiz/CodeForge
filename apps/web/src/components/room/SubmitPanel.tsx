'use client';

import { useState, useRef, useCallback } from 'react';

interface SubmitPanelProps {
  code: string;
  language: string;
}

type Status = 'idle' | 'submitting' | 'polling' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const POLL_INTERVAL = 1500;
const MAX_POLLS = 20;

function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';
}

export default function SubmitPanel({ code, language }: SubmitPanelProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<{
    verdict?: string;
    stdout?: string;
    stderr?: string;
    executionTimeMs?: number;
  } | null>(null);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  async function handleSubmit() {
    if (!code.trim()) return;

    setStatus('submitting');
    setResult(null);
    setError('');
    clearPoll();

    try {
      const res = await fetch(`${API}/api/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ language, sourceCode: code }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Submit failed (${res.status})`);
        setStatus('idle');
        return;
      }

      const data = await res.json();
      const submissionId = data.submission.id;

      setStatus('polling');
      let polls = 0;

      pollRef.current = setInterval(async () => {
        polls++;
        if (polls > MAX_POLLS) {
          clearPoll();
          setError('Execution timed out. Please try again.');
          setStatus('idle');
          return;
        }

        try {
          const pollRes = await fetch(`${API}/api/submissions/${submissionId}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          const pollData = await pollRes.json();
          const sub = pollData.submission;

          if (sub.status === 'PROCESSING') {
            setStatus('PROCESSING');
          }

          if (sub.status === 'COMPLETED' || sub.status === 'FAILED') {
            clearPoll();
            setStatus(sub.status);
            setResult({
              verdict: sub.verdict,
              stdout: sub.stdout,
              stderr: sub.stderr,
              executionTimeMs: sub.executionTimeMs,
            });
          }
        } catch {
          /* swallow poll network errors — retry on next interval */
        }
      }, POLL_INTERVAL);
    } catch {
      setError('Network error');
      setStatus('idle');
    }
  }

  const isRunning = status === 'submitting' || status === 'polling' || status === 'PROCESSING';

  return (
    <div className="submit-panel">
      <div className="submit-toolbar">
        <button className="btn-run" onClick={handleSubmit} disabled={isRunning}>
          {isRunning ? (
            <>
              <span className="spinner" />
              {status === 'PROCESSING' ? 'Executing…' : 'Submitting…'}
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

        {status === 'COMPLETED' && result?.executionTimeMs != null && (
          <span className="exec-time">{result.executionTimeMs}ms</span>
        )}

        {status === 'COMPLETED' && (
          <span className="verdict-badge verdict-success">
            {result?.verdict ?? 'Completed'}
          </span>
        )}

        {status === 'FAILED' && (
          <span className="verdict-badge verdict-fail">
            {result?.verdict ?? 'Failed'}
          </span>
        )}
      </div>

      {error && <div className="output-error">{error}</div>}

      {result && (
        <div className="output-panel">
          {result.stdout && (
            <div className="output-section">
              <div className="output-label">stdout</div>
              <pre className="output-code">{result.stdout}</pre>
            </div>
          )}
          {result.stderr && (
            <div className="output-section">
              <div className="output-label output-label-err">stderr</div>
              <pre className="output-code output-code-err">{result.stderr}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
