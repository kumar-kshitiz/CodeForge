"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";

interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  kind: "QUESTION" | "CHALLENGE";
  challengeActive: boolean;
  challengeEndsAt?: string | null;
  tags: { name: string }[];
}
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function shuffleQuestions(problems: Problem[]): Problem[] {
  const shuffled = problems.filter((problem) => problem.kind === "QUESTION");
  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

export default function ProblemsPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [deckProblems, setDeckProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [contentType, setContentType] = useState("all");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!token) return;
    const controller = new AbortController();
    fetch(`${API}/api/problems`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok)
          throw new Error("Unable to load challenges. Please try again.");
        return res.json();
      })
      .then((data) => {
        const loadedProblems = Array.isArray(data.problems)
          ? (data.problems as Problem[])
          : [];
        setProblems(loadedProblems);
        setDeckProblems(shuffleQuestions(loadedProblems));
      })
      .catch((err) => {
        if (err.name !== "AbortError")
          setError(
            "We couldn’t load your challenges. Check your connection and try again.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [authLoading, isAuthenticated, token, router, retry]);
  const filtered = problems.filter(
    (p) =>
      (contentType === "all" ||
        (contentType === "questions" && p.kind === "QUESTION") ||
        (contentType === "challenges" && p.kind === "CHALLENGE")) &&
      (difficulty === "all" || p.difficulty.toLowerCase() === difficulty) &&
      `${p.title} ${p.tags.map((t) => t.name).join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  if (authLoading || !isAuthenticated)
    return (
      <div className="empty-state" role="status">
        Getting your playground ready…
      </div>
    );
  return (
    <div className="challenge-page">
      <header className="challenge-heading">
        <div>
          <span className="eyebrow">THE PRACTICE PLAYGROUND</span>
          <h1>
            A little challenge.
            <br />
            <span>A big step forward.</span>
          </h1>
          <p>Pick a problem. Follow your curiosity. Surprise yourself.</p>
        </div>
        <span className="challenge-doodle" aria-hidden="true">
          {"{ }"}
        </span>
      </header>
      <section className="challenge-library" aria-label="Challenge library">
        <div className="library-toolbar">
          <div className="library-filter-groups">
            <div className="filter-tabs" aria-label="Content type">
              {[
                ["all", "All"],
                ["questions", "Questions"],
                ["challenges", "Live challenges"],
                ["mystery", "Code Quest Shuffle"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  aria-pressed={contentType === value}
                  onClick={() => setContentType(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            {contentType !== "mystery" && (
              <div className="filter-tabs filter-tabs-secondary" aria-label="Difficulty">
                {["all", "easy", "medium", "hard"].map((level) => (
                  <button
                    key={level}
                    aria-pressed={difficulty === level}
                    onClick={() => setDifficulty(level)}
                  >
                    {level === "all" ? "Any level" : level}
                  </button>
                ))}
              </div>
            )}
          </div>
          {contentType === "mystery" ? (
            <button
              type="button"
              className="btn-ghost deck-shuffle-button"
              onClick={() => setDeckProblems(shuffleQuestions(problems))}
            >
              Shuffle again ↻
            </button>
          ) : (
            <input
              className="challenge-search"
              type="search"
              aria-label="Search challenges or topics"
              placeholder="Search a challenge or topic…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
        </div>
        <div className="library-caption">
          <span>
            {loading
              ? "Finding your next challenge…"
              : contentType === "mystery"
                ? `${deckProblems.length} mystery cards are waiting`
                : `${filtered.length} questions and challenges to explore`}
          </span>
          <span>
            {contentType === "mystery"
              ? "No peeking—trust the shuffle ✦"
              : "Small progress is still progress ✳"}
          </span>
        </div>
        {error ? (
          <div className="empty-state" role="alert">
            <h2>A small bump in the road.</h2>
            <p>{error}</p>
            <button
              className="btn-primary"
              onClick={() => {
                setLoading(true);
                setError("");
                setRetry((v) => v + 1);
              }}
            >
              Try again ↗
            </button>
          </div>
        ) : loading ? (
          <div className="challenge-grid" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div className="challenge-skeleton" key={i} />
            ))}
          </div>
        ) : contentType === "mystery" && deckProblems.length > 0 ? (
          <div className="mystery-deck-section">
            <div className="mystery-deck-intro">
              <span className="eyebrow">CODE QUEST SHUFFLE</span>
              <h2>Pick a card. Meet your next problem.</h2>
              <p>
                Every card hides a normal practice question. Its title, topic,
                and difficulty stay secret until you choose.
              </p>
            </div>
            <div className="mystery-card-grid">
              {deckProblems.map((problem, index) => (
                <button
                  type="button"
                  className={`mystery-card mystery-card-${index % 4}`}
                  key={problem.id}
                  onClick={() =>
                    router.push(`/problems/${problem.slug}?mode=shuffle`)
                  }
                  aria-label={`Choose mystery question card ${index + 1}`}
                >
                  <span className="mystery-card-corner">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="mystery-card-symbol" aria-hidden="true">
                    {index % 4 === 0
                      ? "{?}"
                      : index % 4 === 1
                        ? "✦"
                        : index % 4 === 2
                          ? "⌁"
                          : "</>"}
                  </span>
                  <strong>Pick me</strong>
                  <small>Question and level stay a mystery</small>
                </button>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <h2>No challenges here just yet.</h2>
            <p>
              {problems.length
                ? "Try another search or difficulty."
                : "Check back soon for your next challenge."}
            </p>
            {problems.length > 0 && (
              <button
                className="btn-ghost"
                onClick={() => {
                  setQuery("");
                  setDifficulty("all");
                  setContentType("all");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="challenge-grid">
            {filtered.map((p, i) => (
              <Link
                href={`/problems/${p.slug}`}
                className="challenge-card"
                key={p.id}
              >
                <div className="card-top">
                  <div className="challenge-card-badges">
                    <span className={`badge diff-${p.difficulty.toLowerCase()}`}>
                      {p.difficulty}
                    </span>
                    <span className={`content-kind-badge ${p.kind.toLowerCase()}`}>
                      {p.kind === "CHALLENGE" ? "Live challenge" : "Question"}
                    </span>
                  </div>
                  <span className="challenge-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h2>{p.title}</h2>
                <div className="challenge-tags">
                  {p.tags.map((t) => (
                    <span key={t.name}>{t.name}</span>
                  ))}
                </div>
                <div className="challenge-card-footer">
                  <div>
                    {p.kind === "CHALLENGE" && p.challengeEndsAt ? (
                      <small>
                        Ends {new Date(p.challengeEndsAt).toLocaleString()}
                      </small>
                    ) : (
                      "Practice at your pace"
                    )}
                  </div>
                  <span>↗</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
