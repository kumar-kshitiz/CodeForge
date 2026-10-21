"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  use,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Editor from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import SubmitPanel from "@/components/room/SubmitPanel";
import SyntaxFinder from "@/components/editor/SyntaxFinder";
import type { SupportedSyntaxLanguage } from "@/data/syntaxReference";
import Link from "next/link";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/store/authStore";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
// Keep pending saves ordered even when navigation remounts the workspace.
const draftSaveQueue = { current: Promise.resolve() as Promise<void> };

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
  searchParams: Promise<{ contestId?: string; mode?: string; teamMatchId?: string }>;
}) {
  const { slug } = use(params);
  const { contestId, mode, teamMatchId } = use(searchParams);
  const isShuffleMode = mode === "shuffle";
  const [problem, setProblem] = useState<Problem | null>(null);
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const userId = useAuthStore((state) => state.user?.id);
  const [preferenceOwner, setPreferenceOwner] = useState<string>();
  const [loadedDraftKey, setLoadedDraftKey] = useState("");
  const [draftError, setDraftError] = useState("");
  const [draftRetry, setDraftRetry] = useState(0);
  const [resettingCode, setResettingCode] = useState(false);
  const [topicsRevealed, setTopicsRevealed] = useState(false);
  const draftKey = `${userId}:${slug}:${language}`;
  const draftReady = preferenceOwner === userId && !!userId && loadedDraftKey === draftKey;
  const [loading, setLoading] = useState(true);
  const [statementWidth, setStatementWidth] = useState(42);
  const [resultsHeight, setResultsHeight] = useState(34);
  const { theme } = useTheme();
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Autosave draft logic
  const saveDraftTimeout = useRef<NodeJS.Timeout | null>(null);
  const pendingDraft = useRef<{ slug: string; language: string; code: string; token: string } | null>(null);
  const saveQueue = draftSaveQueue;

  const flushDraft = useCallback(() => {
    if (saveDraftTimeout.current) clearTimeout(saveDraftTimeout.current);
    const draft = pendingDraft.current;
    pendingDraft.current = null;
    if (!draft) return;
    saveQueue.current = saveQueue.current.then(async () => {
      const response = await fetch(`${API}/api/problems/${draft.slug}/draft`, {
        method: "PUT",
        keepalive: true,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${draft.token}` },
        body: JSON.stringify({ language: draft.language, code: draft.code }),
      });
      if (!response.ok) throw new Error("Could not save draft");
    }).catch((error) => console.error("Failed to save draft", error));
  }, []);

  useEffect(() => {
    setTopicsRevealed(false);
  }, [slug]);

  useEffect(() => {
    if (!userId) return;
    let preferred = "javascript";
    try {
      const saved = localStorage.getItem(`codeforge:language:${userId}`);
      if (saved && ["javascript", "python", "cpp"].includes(saved)) preferred = saved;
    } catch { /* Storage may be unavailable; keep the default. */ }
    setLanguage(preferred);
    setPreferenceOwner(userId);
  }, [userId]);

  useEffect(() => {
    window.addEventListener("pagehide", flushDraft);
    return () => {
      window.removeEventListener("pagehide", flushDraft);
      flushDraft();
    };
  }, [flushDraft]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setProblem(null);
    fetch(`${API}/api/problems/${slug}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!controller.signal.aborted && data.problem) setProblem(data.problem);
      })
      .catch(() => { if (!controller.signal.aborted) setProblem(null); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [slug]);

  // Load draft when problem or language changes
  useEffect(() => {
    if (!problem || problem.slug !== slug || !userId || preferenceOwner !== userId) return;
    const controller = new AbortController();
    setLoadedDraftKey("");
    setDraftError("");
    flushDraft();
    saveQueue.current.then(() => {
      if (controller.signal.aborted) return;
      return fetch(`${API}/api/problems/${slug}/draft?language=${language}`, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${getToken()}` },
      }).then((res) => {
        if (!res.ok) throw new Error("Could not load draft");
        return res.json();
      });
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        setCode(data?.draft?.code ?? problem.starterCode?.[language] ?? "");
        setLoadedDraftKey(draftKey);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setDraftError("Could not load your saved code. Please try again.");
        }
      });
    return () => { controller.abort(); flushDraft(); };
  }, [problem, language, slug, userId, preferenceOwner, draftKey, flushDraft, draftRetry]);

  const changeLanguage = (nextLanguage: string) => {
    flushDraft();
    setLoadedDraftKey("");
    setCode("");
    setLanguage(nextLanguage);
    if (userId) {
      try { localStorage.setItem(`codeforge:language:${userId}`, nextLanguage); }
      catch { /* The selection still works for this visit. */ }
    }
  };

  const resetCode = async () => {
    if (!problem || !draftReady || resettingCode) return;
    setResettingCode(true);
    setDraftError("");
    if (saveDraftTimeout.current) clearTimeout(saveDraftTimeout.current);
    pendingDraft.current = null;

    try {
      await saveQueue.current;
      const response = await fetch(
        `${API}/api/problems/${slug}/draft?language=${encodeURIComponent(language)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getToken()}` },
        },
      );
      if (!response.ok) throw new Error("Could not reset your code");
      setCode(problem.starterCode?.[language] ?? "");
    } catch {
      setDraftError("Could not reset your code. Please try again.");
    } finally {
      setResettingCode(false);
    }
  };

  const handleCodeChange = (value: string | undefined) => {
    if (!draftReady) return;
    const newCode = value || "";
    setCode(newCode);

    // Debounced Autosave (1 second)
    if (saveDraftTimeout.current) clearTimeout(saveDraftTimeout.current);
    pendingDraft.current = { slug, language, code: newCode, token: getToken() };
    saveDraftTimeout.current = setTimeout(flushDraft, 1000);
  };

  const insertSyntax = (syntax: string) => {
    const editorInstance = editorRef.current;
    const selection = editorInstance?.getSelection();
    if (!editorInstance || !selection) return;
    editorInstance.executeEdits("syntax-finder", [
      { range: selection, text: syntax, forceMoveMarkers: true },
    ]);
    editorInstance.focus();
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
              <Link href={isShuffleMode ? "/problems?mode=shuffle" : "/problems"} className="back-link">
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

          {!isShuffleMode && problem.tags.length > 0 && (
            <section className={`topic-envelope ${topicsRevealed ? "open" : ""}`}>
              <button
                type="button"
                className="topic-envelope-trigger"
                aria-expanded={topicsRevealed}
                aria-controls="problem-topics"
                onClick={() => setTopicsRevealed((current) => !current)}
              >
                <span className="topic-envelope-visual" aria-hidden="true" />
                <span className="topic-envelope-copy">
                    <small>TOPICS</small>
                  <strong>{topicsRevealed ? "Topics revealed" : "Open the topic envelope"}</strong>
                </span>
                <span className="topic-envelope-action">
                  {topicsRevealed ? "Close ↑" : "Reveal ↗"}
                </span>
              </button>
              <div id="problem-topics" className="topic-envelope-content" hidden={!topicsRevealed}>
                <div>
                  {problem.tags.map((tag) => <span key={tag.name}>{tag.name}</span>)}
                </div>
              </div>
            </section>
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
              onChange={(e) => changeLanguage(e.target.value)}
              disabled={!userId || preferenceOwner !== userId}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="cpp">C++</option>
            </select>
            <div className="editor-toolbar-actions">
              <SyntaxFinder
                language={language as SupportedSyntaxLanguage}
                onInsert={insertSyntax}
                getContext={() => {
                  const position = editorRef.current?.getPosition();
                  return {
                    line: position ? editorRef.current?.getModel()?.getLineContent(position.lineNumber) ?? "" : "",
                    column: position?.column ?? 1,
                  };
                }}
              />
              <span
                className="save-status text-muted text-sm"
                role={draftError ? "alert" : undefined}
              >
                {draftError || "Your space to experiment ✳"}
              </span>
              <button
                type="button"
                className="reset-code-button"
                onClick={resetCode}
                disabled={!draftReady || resettingCode}
                title={`Restore the ${language} starter code`}
              >
                {resettingCode ? "Resetting…" : "Reset code"}
              </button>
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
            {draftReady ? <Editor
              path={`${userId}/${slug}/${language}`}
              height="100%"
              language={language === "cpp" ? "cpp" : language}
              theme={theme === "dark" ? "vs-dark" : "light"}
              value={code}
              onChange={handleCodeChange}
              onMount={(editorInstance) => { editorRef.current = editorInstance; }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
              }}
            /> : draftError ? (
              <div role="alert">
                <p>{draftError}</p>
                <button type="button" onClick={() => setDraftRetry((value) => value + 1)}>Retry</button>
              </div>
            ) : <div role="status">Loading your code…</div>}
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
          {draftReady && <SubmitPanel
            code={code}
            language={language}
            problemId={problem.id}
            teamMatchId={teamMatchId}
          />}
        </div>
      </div>
    </div>
  );
}
