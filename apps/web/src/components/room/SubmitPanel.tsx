"use client";

import { useState, useEffect, useRef } from "react";
import AiFeedbackPanel from "../ai-feedback/AiFeedbackPanel";

interface SubmitPanelProps {
  code: string;
  language: string;
  problemId?: string;
}

type Status =
  | "idle"
  | "submitting"
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

type ExecutionMode = "RUN" | "SUBMIT";

export interface SubmissionHistory {
  id: string;
  problemId?: string;
  mode?: ExecutionMode;
  status: Status;
  verdict: string | null;
  language: string;
  runtimeMs: number | null;
  memoryKb?: number | null;
  scoreAwarded?: number | null;
  createdAt: string;
  stdout: string | null;
  stderr: string | null;
  passedTestCases?: number | null;
  totalTestCases?: number | null;
  failedTestCase?: { input: string; expected: string; actual: string } | null;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getToken(): string {
  return typeof window !== "undefined"
    ? (localStorage.getItem("accessToken") ?? "")
    : "";
}

export default function SubmitPanel({
  code,
  language,
  problemId,
}: SubmitPanelProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [history, setHistory] = useState<SubmissionHistory[]>([]);
  const [activeSubmission, setActiveSubmission] =
    useState<SubmissionHistory | null>(null);
  const [error, setError] = useState("");
  const [activeMode, setActiveMode] = useState<ExecutionMode | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  // Fetch history on mount
  useEffect(() => {
    const historyUrl = problemId
      ? `${API}/api/submissions?problemId=${encodeURIComponent(problemId)}`
      : `${API}/api/submissions`;

    fetch(historyUrl, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.submissions) {
          const submissions = data.submissions as SubmissionHistory[];
          // Filter to show submissions for the current problem if applicable
          const relevantSubmissions = problemId
            ? submissions.filter((submission) => submission.problemId === problemId)
            : submissions;

          setHistory(relevantSubmissions);
          if (relevantSubmissions.length > 0) {
            setActiveSubmission(relevantSubmissions[0]);
          }
        }
      })
      .catch((err) => console.error("Failed to load history", err));
  }, [problemId]);

  async function handleExecute(mode: ExecutionMode) {
    if (!code.trim()) return;

    setStatus("submitting");
    setActiveMode(mode);
    setError("");

    try {
      const res = await fetch(`${API}/api/submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ language, sourceCode: code, problemId, mode }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Submit failed (${res.status})`);
        setStatus("idle");
        setActiveMode(null);
        return;
      }

      const data = await res.json();
      setActiveSubmission(data.submission);
      if (mode === "SUBMIT") {
        setHistory((prev) => [data.submission, ...prev]);
      }
      setStatus("PENDING");

      pollSubmissionStatus(data.submission.id, mode);
    } catch {
      setError("Network error — is the API server running?");
      setStatus("idle");
      setActiveMode(null);
    }
  }

  function pollSubmissionStatus(
    submissionId: string,
    mode: ExecutionMode,
  ) {
    stopPolling();

    let attempts = 0;
    const maxAttempts = 30;

    pollIntervalRef.current = setInterval(async () => {
      attempts++;

      try {
        const res = await fetch(`${API}/api/submissions/${submissionId}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Status request failed (${res.status})`);
        }

        const data = await res.json();

        const sub = data.submission;

        if (!sub) return;

        setStatus(sub.status);

        if (mode === "SUBMIT") {
          setHistory((prev) => {
            const idx = prev.findIndex((s) => s.id === sub.id);

            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = sub;
              return copy;
            }

            return [sub, ...prev];
          });
        }

        setActiveSubmission((prev) => {
          if (prev?.id === sub.id) {
            return sub;
          }
          return prev;
        });

        if (sub.status === "COMPLETED" || sub.status === "FAILED") {
          stopPolling();
          setTimeout(() => {
            setStatus("idle");
            setActiveMode(null);
          }, 2000);
        }
      } catch {
        // Ignore transient errors
      }

      if (attempts >= maxAttempts) {
        stopPolling();
        setStatus("idle");
        setActiveMode(null);
        setError(
          mode === "RUN"
            ? "The run is still queued. Make sure Redis and the execution service are running."
            : "The submission is still queued. Make sure Redis and the execution service are running.",
        );
      }
    }, 1000);
  }

  const isRunning =
    status === "submitting" || status === "PENDING" || status === "PROCESSING";

  return (
    <div className="submit-panel">
      <div className="submit-toolbar">
        <button
          className="btn-run"
          onClick={() => handleExecute("RUN")}
          disabled={isRunning}
        >
          {isRunning && activeMode === "RUN" ? (
            <>
              <span className="spinner" />
              {status === "submitting"
                ? "Starting..."
                : status === "PENDING"
                  ? "Queued..."
                  : "Executing..."}
            </>
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Run Code
            </>
          )}
        </button>
        <button
          className="btn-submit"
          onClick={() => handleExecute("SUBMIT")}
          disabled={isRunning}
        >
          {isRunning && activeMode === "SUBMIT" ? (
            <>
              <span className="spinner" />
              {status === "submitting"
                ? "Submitting..."
                : status === "PENDING"
                  ? "Queued..."
                  : "Judging..."}
            </>
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Submit
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
              <span
                className={`verdict-badge ${activeSubmission.verdict === "accepted" ? "verdict-success" : activeSubmission.status === "COMPLETED" || activeSubmission.status === "FAILED" ? "verdict-fail" : ""}`}
              >
                {activeSubmission.verdict || activeSubmission.status}
              </span>
              {activeSubmission.runtimeMs != null && (
                <span className="exec-time">
                  {activeSubmission.runtimeMs}ms
                </span>
              )}
              {activeSubmission.totalTestCases != null &&
                activeSubmission.totalTestCases > 0 && (
                  <span className="testcase-ratio">
                    Passed {activeSubmission.passedTestCases} /{" "}
                    {activeSubmission.totalTestCases}
                  </span>
                )}
              {activeSubmission.scoreAwarded != null && (
                <span className="challenge-score-chip">
                  Score {activeSubmission.scoreAwarded.toFixed(2)}
                </span>
              )}
            </div>

            {activeSubmission.failedTestCase && (
              <div className="failed-testcase-container">
                <div className="failed-testcase-title">Testcase Failed</div>
                <div className="testcase-row">
                  <div className="testcase-label">Input</div>
                  <pre className="testcase-value">
                    {activeSubmission.failedTestCase.input}
                  </pre>
                </div>
                <div className="testcase-row">
                  <div className="testcase-label">Expected Output</div>
                  <pre className="testcase-value testcase-expected">
                    {activeSubmission.failedTestCase.expected}
                  </pre>
                </div>
                <div className="testcase-row">
                  <div className="testcase-label">Actual Output</div>
                  <pre className="testcase-value testcase-actual">
                    {activeSubmission.failedTestCase.actual}
                  </pre>
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
                <pre className="output-code output-code-err">
                  {activeSubmission.stderr}
                </pre>
              </div>
            )}

            {(activeSubmission.status === "COMPLETED" ||
              activeSubmission.status === "FAILED") && (
              <div style={{ marginTop: "24px" }}>
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
            <h4>Previous submissions</h4>
            <div className="history-table">
              {history.map((sub) => (
                <div
                  key={sub.id}
                  className={`history-row ${activeSubmission?.id === sub.id ? "active" : ""}`}
                  onClick={() => setActiveSubmission(sub)}
                >
                  <div className="history-col-verdict">
                    <span
                      className={`status-dot ${sub.status.toLowerCase()}`}
                    ></span>
                    {sub.verdict || sub.status}
                  </div>
                  <div className="history-col-lang">{sub.language}</div>
                  <div className="history-col-time">
                    {sub.runtimeMs ? `${sub.runtimeMs}ms` : "-"}
                  </div>
                  <div className="history-col-testcases">
                    {sub.totalTestCases
                      ? `${sub.passedTestCases}/${sub.totalTestCases}`
                      : "-"}
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
