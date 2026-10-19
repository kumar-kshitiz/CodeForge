"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuthStore } from "../../../../store/authStore";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const languages = ["javascript", "python", "cpp"] as const;
type Language = (typeof languages)[number];

interface ExampleDraft {
  inputText: string;
  outputText: string;
  explanation: string;
}

interface TestCaseDraft {
  visibility: "PUBLIC" | "HIDDEN";
  inputText: string;
  expectedOutputText: string;
  points: number;
  groupId: string;
}

interface SolutionDraft {
  language: Language;
  sourceCode: string;
  editorialMd: string;
  visibility: "PRIVATE" | "PUBLIC";
}

const emptyExample = (): ExampleDraft => ({
  inputText: "",
  outputText: "",
  explanation: "",
});
const emptyTestCase = (): TestCaseDraft => ({
  visibility: "HIDDEN",
  inputText: "",
  expectedOutputText: "",
  points: 1,
  groupId: "",
});
const emptySolution = (): SolutionDraft => ({
  language: "javascript",
  sourceCode: "",
  editorialMd: "",
  visibility: "PRIVATE",
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function NewProblemPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading } = useAuthStore();
  const canManage = user?.role === "ADMIN" || user?.role === "INTERVIEWER";

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [difficulty, setDifficulty] = useState("easy");
  const [status, setStatus] = useState("PUBLISHED");
  const [kind, setKind] = useState<"QUESTION" | "CHALLENGE">("QUESTION");
  const [challengeEndsAt, setChallengeEndsAt] = useState("");
  const [publishAfterChallenge, setPublishAfterChallenge] = useState(true);
  const [statementMd, setStatementMd] = useState("");
  const [constraintsMd, setConstraintsMd] = useState("");
  const [timeLimitMs, setTimeLimitMs] = useState(2000);
  const [memoryLimitMb, setMemoryLimitMb] = useState(256);
  const [tags, setTags] = useState("");
  const [starterCode, setStarterCode] = useState<Record<Language, string>>({
    javascript: "",
    python: "",
    cpp: "",
  });
  const [starterLanguage, setStarterLanguage] =
    useState<Language>("javascript");
  const [examples, setExamples] = useState<ExampleDraft[]>([emptyExample()]);
  const [testCases, setTestCases] = useState<TestCaseDraft[]>([
    emptyTestCase(),
  ]);
  const [solutions, setSolutions] = useState<SolutionDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdSlug, setCreatedSlug] = useState("");
  const [createdPublished, setCreatedPublished] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, isLoading, router]);

  const updateExample = (index: number, patch: Partial<ExampleDraft>) =>
    setExamples((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  const updateTestCase = (index: number, patch: Partial<TestCaseDraft>) =>
    setTestCases((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  const updateSolution = (index: number, patch: Partial<SolutionDraft>) =>
    setSolutions((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !canManage) return;

    setSubmitting(true);
    setError("");
    setCreatedSlug("");
    setCreatedPublished(false);

    const populatedStarterCode = Object.fromEntries(
      Object.entries(starterCode).filter(([, code]) => code.trim()),
    );
    const payload = {
      slug,
      title,
      difficulty,
      status,
      kind,
      challengeEndsAt:
        kind === "CHALLENGE" && challengeEndsAt
          ? new Date(challengeEndsAt).toISOString()
          : undefined,
      publishAfterChallenge:
        kind === "CHALLENGE" && publishAfterChallenge,
      statementMd,
      constraintsMd,
      timeLimitMs,
      memoryLimitMb,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      starterCode: Object.keys(populatedStarterCode).length
        ? populatedStarterCode
        : undefined,
      examples: examples
        .filter(
          (example) => example.inputText.trim() || example.outputText.trim(),
        )
        .map((example) => ({
          ...example,
          explanation: example.explanation || undefined,
        })),
      testCases: testCases.map((testCase) => ({
        ...testCase,
        groupId: testCase.groupId || undefined,
      })),
      officialSolutions: solutions
        .filter((solution) => solution.sourceCode.trim())
        .map((solution) => ({ ...solution })),
    };

    try {
      const response = await fetch(`${API}/api/problems`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const details = Array.isArray(data.details)
          ? data.details
              .map(
                (item: { field?: string; message?: string }) =>
                  `${item.field}: ${item.message}`,
              )
              .join(" · ")
          : "";
        throw new Error(
          details ||
            data.error ||
            `Unable to create problem (${response.status})`,
        );
      }
      setCreatedSlug(data.problem.slug);
      setCreatedPublished(data.problem.status === "PUBLISHED");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create problem",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || (!isAuthenticated && !isLoading)) {
    return (
      <div className="empty-state" role="status">
        Checking your workspace…
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="empty-state admin-access-denied">
        <span className="feature-symbol">⌁</span>
        <h1>This workspace is for problem authors.</h1>
        <p>Your account needs the Admin or Interviewer role.</p>
        <Link href="/problems" className="btn-primary">
          Back to challenges
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <span className="eyebrow">PROBLEM STUDIO</span>
          <h1>Build a new challenge.</h1>
          <p>
            Define the prompt, examples, judge data, and the solution your
            reviewers can trust.
          </p>
        </div>
        <Link href="/problems" className="btn-ghost">
          View challenge library ↗
        </Link>
      </header>

      {createdSlug && (
        <div className="admin-notice admin-notice-success" role="status">
          <div>
            <strong>Problem created successfully.</strong>
            <span>The challenge and judge data were saved together.</span>
          </div>
          {createdPublished && (
            <Link href={`/problems/${createdSlug}`}>Open challenge ↗</Link>
          )}
        </div>
      )}
      {error && (
        <div className="admin-notice admin-notice-error" role="alert">
          <div>
            <strong>Couldn’t create the problem.</strong>
            <span>{error}</span>
          </div>
        </div>
      )}

      <form className="admin-form" onSubmit={handleSubmit}>
        <section className="admin-section">
          <div className="admin-section-heading">
            <span>01</span>
            <div>
              <h2>Challenge basics</h2>
              <p>The details candidates see in the library.</p>
            </div>
          </div>
          <div className="admin-fields admin-fields-two">
            <label className="admin-field">
              <span>Title</span>
              <input
                required
                value={title}
                onChange={(event) => {
                  const value = event.target.value;
                  setTitle(value);
                  if (!slugEdited) setSlug(slugify(value));
                }}
                placeholder="Two Sum"
              />
            </label>
            <label className="admin-field">
              <span>Slug</span>
              <input
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                value={slug}
                onChange={(event) => {
                  setSlugEdited(true);
                  setSlug(event.target.value);
                }}
                placeholder="two-sum"
              />
              <small>Lowercase letters, numbers, and hyphens.</small>
            </label>
            <label className="admin-field">
              <span>Difficulty</span>
              <select
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label className="admin-field">
              <span>Content type</span>
              <select
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as "QUESTION" | "CHALLENGE")
                }
              >
                <option value="QUESTION">Normal question</option>
                <option value="CHALLENGE">Timed challenge</option>
              </select>
              <small>
                Challenges use run penalties and percentage-based scoring.
              </small>
            </label>
            <label className="admin-field">
              <span>Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>
            {kind === "CHALLENGE" && (
              <>
                <label className="admin-field">
                  <span>Challenge ends at</span>
                  <input
                    type="datetime-local"
                    required
                    value={challengeEndsAt}
                    onChange={(event) => setChallengeEndsAt(event.target.value)}
                  />
                  <small>Uses your browser’s local time.</small>
                </label>
                <label className="admin-field admin-checkbox-field">
                  <input
                    type="checkbox"
                    checked={publishAfterChallenge}
                    onChange={(event) =>
                      setPublishAfterChallenge(event.target.checked)
                    }
                  />
                  <span>
                    <strong>Publish as a normal question afterward</strong>
                    <small>
                      If disabled, the challenge disappears when its timer ends.
                    </small>
                  </span>
                </label>
              </>
            )}
            <label className="admin-field">
              <span>Time limit (ms)</span>
              <input
                type="number"
                required
                min={100}
                max={60000}
                value={timeLimitMs}
                onChange={(event) => setTimeLimitMs(Number(event.target.value))}
              />
            </label>
            <label className="admin-field">
              <span>Memory limit (MB)</span>
              <input
                type="number"
                required
                min={16}
                max={2048}
                value={memoryLimitMb}
                onChange={(event) =>
                  setMemoryLimitMb(Number(event.target.value))
                }
              />
            </label>
            <label className="admin-field admin-field-wide">
              <span>Tags</span>
              <input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="Array, Hash Table, Two Pointers"
              />
              <small>Separate tags with commas.</small>
            </label>
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading">
            <span>02</span>
            <div>
              <h2>Problem content</h2>
              <p>Markdown is supported for the statement and constraints.</p>
            </div>
          </div>
          <div className="admin-fields">
            <label className="admin-field">
              <span>Statement (Markdown)</span>
              <textarea
                required
                rows={12}
                value={statementMd}
                onChange={(event) => setStatementMd(event.target.value)}
                placeholder="Describe the problem, input, and expected output…"
              />
            </label>
            <label className="admin-field">
              <span>Constraints (Markdown)</span>
              <textarea
                rows={6}
                value={constraintsMd}
                onChange={(event) => setConstraintsMd(event.target.value)}
                placeholder={
                  "- 2 ≤ nums.length ≤ 10⁴\n- Exactly one answer exists"
                }
              />
            </label>
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading">
            <span>03</span>
            <div>
              <h2>Starter code</h2>
              <p>
                Give candidates a helpful beginning in each supported language.
              </p>
            </div>
          </div>
          <div className="admin-code-tabs">
            {languages.map((language) => (
              <button
                key={language}
                type="button"
                aria-pressed={starterLanguage === language}
                onClick={() => setStarterLanguage(language)}
              >
                {language}
              </button>
            ))}
          </div>
          <label className="admin-field">
            <span>{starterLanguage} starter</span>
            <textarea
              className="admin-code-input"
              rows={12}
              spellCheck={false}
              value={starterCode[starterLanguage]}
              onChange={(event) =>
                setStarterCode((current) => ({
                  ...current,
                  [starterLanguage]: event.target.value,
                }))
              }
              placeholder="Write starter code or a complete stdin/stdout program…"
            />
          </label>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading admin-section-heading-action">
            <span>04</span>
            <div>
              <h2>Examples</h2>
              <p>Public examples explain the expected behavior.</p>
            </div>
            <button
              type="button"
              className="btn-ghost"
              onClick={() =>
                setExamples((current) => [...current, emptyExample()])
              }
            >
              + Add example
            </button>
          </div>
          <div className="admin-repeat-list">
            {examples.map((example, index) => (
              <article className="admin-repeat-card" key={index}>
                <div className="admin-repeat-title">
                  <h3>Example {index + 1}</h3>
                  {examples.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExamples((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="admin-fields admin-fields-two">
                  <label className="admin-field">
                    <span>Input</span>
                    <textarea
                      rows={4}
                      value={example.inputText}
                      onChange={(event) =>
                        updateExample(index, { inputText: event.target.value })
                      }
                    />
                  </label>
                  <label className="admin-field">
                    <span>Output</span>
                    <textarea
                      rows={4}
                      value={example.outputText}
                      onChange={(event) =>
                        updateExample(index, { outputText: event.target.value })
                      }
                    />
                  </label>
                  <label className="admin-field admin-field-wide">
                    <span>Explanation</span>
                    <textarea
                      rows={3}
                      value={example.explanation}
                      onChange={(event) =>
                        updateExample(index, {
                          explanation: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading admin-section-heading-action">
            <span>05</span>
            <div>
              <h2>Judge test cases</h2>
              <p>
                At least one case is required. Hidden case contents never reach
                candidates.
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost"
              onClick={() =>
                setTestCases((current) => [...current, emptyTestCase()])
              }
            >
              + Add test case
            </button>
          </div>
          <div className="admin-repeat-list">
            {testCases.map((testCase, index) => (
              <article className="admin-repeat-card" key={index}>
                <div className="admin-repeat-title">
                  <h3>Test case {index + 1}</h3>
                  {testCases.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setTestCases((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="admin-fields admin-fields-three">
                  <label className="admin-field">
                    <span>Visibility</span>
                    <select
                      value={testCase.visibility}
                      onChange={(event) =>
                        updateTestCase(index, {
                          visibility: event.target
                            .value as TestCaseDraft["visibility"],
                        })
                      }
                    >
                      <option value="PUBLIC">Public</option>
                      <option value="HIDDEN">Hidden</option>
                    </select>
                  </label>
                  <label className="admin-field">
                    <span>Points</span>
                    <input
                      type="number"
                      min={1}
                      required
                      value={testCase.points}
                      onChange={(event) =>
                        updateTestCase(index, {
                          points: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="admin-field">
                    <span>Group ID</span>
                    <input
                      value={testCase.groupId}
                      onChange={(event) =>
                        updateTestCase(index, { groupId: event.target.value })
                      }
                      placeholder="Optional"
                    />
                  </label>
                  <label className="admin-field">
                    <span>Input</span>
                    <textarea
                      required
                      rows={5}
                      value={testCase.inputText}
                      onChange={(event) =>
                        updateTestCase(index, { inputText: event.target.value })
                      }
                    />
                  </label>
                  <label className="admin-field">
                    <span>Expected output</span>
                    <textarea
                      required
                      rows={5}
                      value={testCase.expectedOutputText}
                      onChange={(event) =>
                        updateTestCase(index, {
                          expectedOutputText: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading admin-section-heading-action">
            <span>06</span>
            <div>
              <h2>Official solutions</h2>
              <p>Optional reviewer references and editorials.</p>
            </div>
            <button
              type="button"
              className="btn-ghost"
              onClick={() =>
                setSolutions((current) => [...current, emptySolution()])
              }
            >
              + Add solution
            </button>
          </div>
          {solutions.length === 0 ? (
            <div className="admin-inline-empty">
              No official solutions added yet.
            </div>
          ) : (
            <div className="admin-repeat-list">
              {solutions.map((solution, index) => (
                <article className="admin-repeat-card" key={index}>
                  <div className="admin-repeat-title">
                    <h3>Official solution {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() =>
                        setSolutions((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                  <div className="admin-fields admin-fields-two">
                    <label className="admin-field">
                      <span>Language</span>
                      <select
                        value={solution.language}
                        onChange={(event) =>
                          updateSolution(index, {
                            language: event.target.value as Language,
                          })
                        }
                      >
                        {languages.map((language) => (
                          <option value={language} key={language}>
                            {language}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="admin-field">
                      <span>Visibility</span>
                      <select
                        value={solution.visibility}
                        onChange={(event) =>
                          updateSolution(index, {
                            visibility: event.target
                              .value as SolutionDraft["visibility"],
                          })
                        }
                      >
                        <option value="PRIVATE">Private</option>
                        <option value="PUBLIC">Public</option>
                      </select>
                    </label>
                    <label className="admin-field admin-field-wide">
                      <span>Source code</span>
                      <textarea
                        required
                        className="admin-code-input"
                        rows={12}
                        spellCheck={false}
                        value={solution.sourceCode}
                        onChange={(event) =>
                          updateSolution(index, {
                            sourceCode: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="admin-field admin-field-wide">
                      <span>Editorial (Markdown)</span>
                      <textarea
                        rows={6}
                        value={solution.editorialMd}
                        onChange={(event) =>
                          updateSolution(index, {
                            editorialMd: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="admin-submit-bar">
          <div>
            <strong>Ready to save?</strong>
            <span>Problem content and judge data are created atomically.</span>
          </div>
          <button
            className="btn-primary-lg"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Creating problem…" : "Create problem ↗"}
          </button>
        </div>
      </form>
    </div>
  );
}
