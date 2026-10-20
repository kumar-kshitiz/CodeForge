"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
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
  userSolveCount: number;
  acceptanceRate: number | null;
}
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const PAGE_SIZE = 12;

interface ShuffleDeck {
  deckId: string;
  cards: { token: string }[];
  expiresAt: string;
}

interface SelectedCard {
  token: string;
  slug: string;
}

export default function ProblemsPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = use(searchParams);
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [deck, setDeck] = useState<ShuffleDeck | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);
  const [revealedTitles, setRevealedTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [contentType, setContentType] = useState(mode === "shuffle" ? "mystery" : "all");
  const [retry, setRetry] = useState(0);
  const [total, setTotal] = useState(0);
  const [nextPage, setNextPage] = useState(2);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!token) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const shuffle = contentType === "mystery";
    if (!shuffle) setProblems([]);
    const params = new URLSearchParams({
      page: "1",
      limit: String(PAGE_SIZE),
      type: contentType,
    });
    if (difficulty !== "all") params.set("difficulty", difficulty);
    if (debouncedQuery) params.set("query", debouncedQuery);
    fetch(`${API}/api/problems${shuffle ? "/shuffle" : `?${params.toString()}`}`, {
      method: shuffle ? "POST" : "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok)
          throw new Error("Unable to load challenges. Please try again.");
        return res.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (shuffle) {
          setDeck(data);
          setSelectedCard(null);
          setRevealedTitles({});
          setSelecting(false);
          return;
        }
        const loadedProblems = Array.isArray(data.problems)
          ? (data.problems as Problem[])
          : [];
        setProblems(loadedProblems);
        setTotal(data.pagination?.total ?? loadedProblems.length);
        setHasMore(Boolean(data.pagination?.hasMore));
        setNextPage(2);
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
  }, [authLoading, isAuthenticated, token, router, retry, contentType, difficulty, debouncedQuery]);

  const loadMore = useCallback(async () => {
    if (!token || loadingMore || !hasMore || contentType === "mystery") return;
    setLoadingMore(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(PAGE_SIZE),
        type: contentType,
      });
      if (difficulty !== "all") params.set("difficulty", difficulty);
      if (debouncedQuery) params.set("query", debouncedQuery);
      const response = await fetch(`${API}/api/problems?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load more challenges.");
      const loadedProblems = Array.isArray(data.problems) ? data.problems as Problem[] : [];
      setProblems((current) => [...current, ...loadedProblems]);
      setTotal(data.pagination?.total ?? total);
      setHasMore(Boolean(data.pagination?.hasMore));
      setNextPage((current) => current + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load more challenges.");
    } finally {
      setLoadingMore(false);
    }
  }, [token, loadingMore, hasMore, contentType, nextPage, difficulty, debouncedQuery, total]);

  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;
    if (!trigger || !hasMore || contentType === "mystery") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading && !loadingMore) void loadMore();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(trigger);
    return () => observer.disconnect();
  }, [hasMore, contentType, loading, loadingMore, loadMore]);

  async function selectCard(cardToken: string) {
    if (!deck || selecting || loading) return;
    setSelecting(true);
    setError("");
    try {
      const response = await fetch(`${API}/api/problems/shuffle/${deck.deckId}/select`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ cardToken }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not open this card.");
      setRevealedTitles(Object.fromEntries(
        (data.cards ?? []).map((card: { token: string; title: string }) => [card.token, card.title]),
      ));
      setSelectedCard({ token: data.selectedToken, slug: data.slug });
      setSelecting(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not open this card.");
      setSelecting(false);
    }
  }
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
                  disabled={selecting}
                  onClick={() => {
                    setLoading(true);
                    setError("");
                    setContentType(value);
                    if (value === contentType) setRetry((v) => v + 1);
                  }}
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
                    onClick={() => {
                      setLoading(true);
                      setDifficulty(level);
                    }}
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
              disabled={loading || selecting}
              onClick={() => {
                setLoading(true);
                setError("");
                setRetry((v) => v + 1);
              }}
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
                ? `${deck?.cards.length ?? 0} mystery cards are waiting`
                : `${total} questions and challenges to explore`}
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
        ) : contentType === "mystery" && (deck?.cards.length ?? 0) > 0 ? (
          <div className="mystery-deck-section">
            <div className="mystery-deck-intro">
              <span className="eyebrow">CODE QUEST SHUFFLE</span>
              <h2>Pick a card. Meet your next problem.</h2>
              <p>
                Every card holds a practice question. Choose one to reveal it;
                topics and difficulty stay hidden while you solve.
              </p>
            </div>
            <div className="mystery-card-grid">
              {deck!.cards.map((card, index) => {
                const cardNumber = String(index + 1).padStart(2, "0");
                const symbol = index % 4 === 0 ? "{?}" : index % 4 === 1 ? "✦" : index % 4 === 2 ? "⌁" : "</>";
                const revealedTitle = revealedTitles[card.token];
                if (revealedTitle) {
                  const selected = selectedCard?.token === card.token;
                  return (
                    <article
                      className={`mystery-card mystery-card-${index % 4} mystery-card-revealed ${selected ? "mystery-card-selected" : ""}`}
                      key={card.token}
                      aria-live="polite"
                    >
                      <span className="mystery-card-corner">{cardNumber}</span>
                      <span className="mystery-card-symbol" aria-hidden="true">{selected ? "✓" : symbol}</span>
                      <small>{selected ? "YOUR PICK" : "REVEALED"}</small>
                      <strong>{revealedTitle}</strong>
                      {selected && (
                        <button
                          type="button"
                          className="mystery-solve-button"
                          onClick={() => router.push(`/problems/${selectedCard.slug}?mode=shuffle`)}
                        >
                          Solve ↗
                        </button>
                      )}
                    </article>
                  );
                }
                return (
                  <button
                    type="button"
                    className={`mystery-card mystery-card-${index % 4}`}
                    key={card.token}
                    disabled={selecting || loading || Boolean(selectedCard)}
                    onClick={() => selectCard(card.token)}
                    aria-label={`Choose mystery question card ${index + 1}`}
                  >
                    <span className="mystery-card-corner">{cardNumber}</span>
                    <span className="mystery-card-symbol" aria-hidden="true">{symbol}</span>
                    <strong>{selecting ? "Opening…" : "Pick me"}</strong>
                    <small>Question and level stay a mystery</small>
                  </button>
                );
              })}
            </div>
          </div>
        ) : problems.length === 0 ? (
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
          <>
          <div className="challenge-grid">
            {problems.map((p, i) => (
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
                <div className="challenge-card-stats">
                  <span>
                    <small>YOUR SOLVES</small>
                    <strong>{p.userSolveCount.toLocaleString()}</strong>
                  </span>
                  <span>
                    <small>ACCEPTANCE</small>
                    <strong>{p.acceptanceRate === null ? "—" : `${p.acceptanceRate}%`}</strong>
                  </span>
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
          {hasMore && (
            <div
              ref={loadMoreTriggerRef}
              className="challenge-load-more"
              role="status"
              aria-live="polite"
              aria-busy={loadingMore}
            >
              {loadingMore && <span className="challenge-loader-dot" aria-hidden="true" />}
              <span>
                {loadingMore
                  ? "Loading more challenges…"
                  : `Scroll for more · ${problems.length} of ${total}`}
              </span>
            </div>
          )}
          </>
        )}
      </section>
    </div>
  );
}
