"use client";

import {
  useState,
  useEffect,
  useRef,
  use,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Editor from "@monaco-editor/react";
import SubmitPanel from "@/components/room/SubmitPanel";
import Link from "next/link";
import { useTheme } from "@/hooks/useTheme";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Problem {
  id: string;
  slug: string;
  title: string;
  statementMd: string;
  difficulty: string;
  kind: "QUESTION" | "CHALLENGE";
  challengeActive?: boolean;
  challengeEndsAt?: string | null;
  starterCode?: Record<string, string>;
  constraintsMd: string;
  examples: {
    id: string;
    inputText: string;
    outputText: string;
    explanation?: string;
    position: number;
  }[];
  tags: { name: string }[];
}

function getToken(): string {
  return typeof window !== "undefined"
    ? (localStorage.getItem("accessToken") ?? "")
    : "";
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export default function ProblemWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ contestId?: string; mode?: string }>;
}) {
  const { slug } = use(params);
  const { contestId, mode } = use(searchParams);
  const isShuffleMode = mode === "shuffle";
  const [problem, setProblem] = useState<Problem | null>(null);
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [statementWidth, setStatementWidth] = useState(42);
  const [resultsHeight, setResultsHeight] = useState(34);
  const { theme } = useTheme();
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);

  // Autosave draft logic
  const saveDraftTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch(`${API}/api/problems/${slug}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.problem) setProblem(data.problem);
      })
      .catch(() => setProblem(null))
      .finally(() => setLoading(false));
  }, [slug]);

  // Load draft when problem or language changes
  useEffect(() => {
    if (!problem) return;
    fetch(`${API}/api/problems/${slug}/draft?language=${language}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.draft?.code) {
          setCode(data.draft.code);
        } else {
          setCode(problem.starterCode?.[language] || "");
        }
      })
      .catch(() => setCode(problem.starterCode?.[language] || ""));
  }, [problem, language, slug]);

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || "";
    setCode(newCode);

    // Debounced Autosave (1 second)
    if (saveDraftTimeout.current) clearTimeout(saveDraftTimeout.current);
    saveDraftTimeout.current = setTimeout(() => {
      fetch(`${API}/api/problems/${slug}/draft`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ language, code: newCode }),
      }).catch((err) => console.error("Failed to save draft", err));
    }, 1000);
  };

  const beginStatementResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (window.innerWidth <= 900) return;
    event.preventDefault();

    const resize = (pointerEvent: PointerEvent) => {
      const bounds = workspaceRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const percentage = ((pointerEvent.clientX - bounds.left) / bounds.width) * 100;
      setStatementWidth(clamp(percentage, 22, 68));
    };

    const finish = () => {
      document.removeEventListener("pointermove", resize);
      document.removeEventListener("pointerup", finish);
      document.body.classList.remove("is-resizing-panels");
    };

    document.body.classList.add("is-resizing-panels");
    document.addEventListener("pointermove", resize);
    document.addEventListener("pointerup", finish);
  };

  const beginResultsResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (window.innerWidth <= 900) return;
    event.preventDefault();

    const resize = (pointerEvent: PointerEvent) => {
      const bounds = rightPanelRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const percentage = ((bounds.bottom - pointerEvent.clientY) / bounds.height) * 100;
      setResultsHeight(clamp(percentage, 18, 68));
    };

    const finish = () => {
      document.removeEventListener("pointermove", resize);
      document.removeEventListener("pointerup", finish);
      document.body.classList.remove("is-resizing-panels");
    };

    document.body.classList.add("is-resizing-panels");
    document.addEventListener("pointermove", resize);
    document.addEventListener("pointerup", finish);
  };

  const workspaceStyle = {
    "--statement-width": `${statementWidth}%`,
  } as CSSProperties;

  const rightPanelStyle = {
    "--results-height": `${resultsHeight}%`,
  } as CSSProperties;

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        Loading Workspace...
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="empty-state">
        <h1>We couldn’t open this challenge.</h1>
        <p>It may be unavailable, or your connection may need another try.</p>
        <Link href="/problems" className="btn-primary">
          Back to challenges
        </Link>
      </div>
    );
  }

  return (
    <div
      className="workspace-container workspace-resizable"
      ref={workspaceRef}
      style={workspaceStyle}
    >
      {/* LEFT PANEL: Problem Details */}
      <div className="workspace-left">
        <div className="problem-header">
          <div className="panel-heading-row">
            {contestId ? (
              <Link href={`/contests/${contestId}`} className="back-link">
                ← Back to Contest
              </Link>
            ) : (
              <Link href="/problems" className="back-link">
                ← Back
              </Link>
            )}
            <div className="panel-size-controls" aria-label="Problem panel size">
              <button
                type="button"
                onClick={() => setStatementWidth((width) => clamp(width - 8, 22, 68))}
                aria-label="Shrink problem statement"
                title="Shrink problem statement"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => setStatementWidth((width) => clamp(width + 8, 22, 68))}
                aria-label="Expand problem statement"
                title="Expand problem statement"
              >
                +
              </button>
            </div>
          </div>
          <h2>{problem.title}</h2>
          <div className="problem-meta">
            <span className={`content-kind-badge ${problem.kind.toLowerCase()}`}>
              {problem.kind === "CHALLENGE" ? "Live challenge" : "Question"}
            </span>
            {isShuffleMode ? (
              <span className="badge mystery-level-badge">Mystery level</span>
            ) : (
              <span className={`diff-${problem.difficulty.toLowerCase()} badge`}>
                {problem.difficulty}
              </span>
            )}
            {problem.tags.map((t) => (
              <span key={t.name} className="tag-badge">
                {t.name}
              </span>
            ))}
          </div>
          {problem.kind === "CHALLENGE" && problem.challengeEndsAt && (
            <p className="challenge-deadline">
              Scoring active until {new Date(problem.challengeEndsAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="problem-body">
          <div className="problem-desc">{problem.statementMd}</div>

          {problem.examples && problem.examples.length > 0 && (
            <div className="problem-examples">
              <h3>Examples</h3>
              {problem.examples.map((ex) => (
                <div key={ex.id} className="example-box">
                  <strong>Input:</strong> <code>{ex.inputText}</code>
                  <br />
                  <strong>Output:</strong> <code>{ex.outputText}</code>
                  {ex.explanation && (
                    <>
                      <br />
                      <strong>Explanation:</strong> {ex.explanation}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {problem.constraintsMd && (
            <div className="problem-constraints">
              <h3>Constraints</h3>
              <div className="problem-desc">{problem.constraintsMd}</div>
            </div>
          )}
        </div>
      </div>

      <div
        className="workspace-resizer workspace-resizer-vertical"
        role="separator"
        aria-label="Resize problem statement and code editor"
        aria-orientation="vertical"
        aria-valuemin={22}
        aria-valuemax={68}
        aria-valuenow={Math.round(statementWidth)}
        tabIndex={0}
        onPointerDown={beginStatementResize}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            setStatementWidth((width) => clamp(width - 3, 22, 68));
          } else if (event.key === "ArrowRight") {
            setStatementWidth((width) => clamp(width + 3, 22, 68));
          }
        }}
      >
        <span />
      </div>

      {/* RIGHT PANEL: Editor & Submit Panel */}
      <div
        className="workspace-right"
        ref={rightPanelRef}
        style={rightPanelStyle}
      >
        <div className="workspace-editor-section">
          <div className="editor-toolbar">
            <select
              className="lang-select"
              aria-label="Programming language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="cpp">C++</option>
            </select>
            <div className="editor-toolbar-actions">
              <span className="save-status text-muted text-sm">
                Your space to experiment ✳
              </span>
              <div className="panel-size-controls" aria-label="Code editor size">
                <button
                  type="button"
                  onClick={() => setResultsHeight((height) => clamp(height + 8, 18, 68))}
                  aria-label="Shrink code editor"
                  title="Shrink code editor"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setResultsHeight((height) => clamp(height - 8, 18, 68))}
                  aria-label="Expand code editor"
                  title="Expand code editor"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="editor-wrapper">
            <Editor
              height="100%"
              language={language === "cpp" ? "cpp" : language}
              theme={theme === "dark" ? "vs-dark" : "light"}
              value={code}
              onChange={handleCodeChange}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
              }}
            />
          </div>
        </div>

        <div
          className="workspace-resizer workspace-resizer-horizontal"
          role="separator"
          aria-label="Resize code editor and run results"
          aria-orientation="horizontal"
          aria-valuemin={18}
          aria-valuemax={68}
          aria-valuenow={Math.round(resultsHeight)}
          tabIndex={0}
          onPointerDown={beginResultsResize}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp") {
              setResultsHeight((height) => clamp(height + 3, 18, 68));
            } else if (event.key === "ArrowDown") {
              setResultsHeight((height) => clamp(height - 3, 18, 68));
            }
          }}
        >
          <span />
          <div className="results-resize-actions" aria-label="Run results size">
            <span>Run &amp; results</span>
            <div className="panel-size-controls">
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => setResultsHeight((height) => clamp(height - 8, 18, 68))}
                aria-label="Shrink run results"
                title="Shrink run results"
              >
                −
              </button>
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => setResultsHeight((height) => clamp(height + 8, 18, 68))}
                aria-label="Expand run results"
                title="Expand run results"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="workspace-submit-wrapper">
          <SubmitPanel code={code} language={language} problemId={problem.id} />
        </div>
      </div>
    </div>
  );
}
