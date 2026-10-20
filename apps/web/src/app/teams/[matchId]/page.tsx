"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";

const TEAM_API = process.env.NEXT_PUBLIC_TEAM_COMPETITION_URL ?? "http://localhost:3002";

type Difficulty = "EASY" | "MEDIUM" | "TOUGH";
interface Player { userId: string; username: string; score: number; questionSlug?: string; questionTitle?: string; solvedAt?: string }
interface Team { id: string; name: string; color: string; players: Player[]; difficultyVote?: Difficulty; leaderId?: string; draftsForTeamId?: string; selectedQuestionIds: string[]; score: number; abilityActivatedAt?: string; abilityPuzzleScore: number; currentPuzzleId?: string }
interface Match { id: string; inviteCode: string; name: string; createdBy: string; status: "LOBBY" | "MATCHMAKING" | "DRAFTING" | "LIVE" | "FINISHED" | "CANCELLED"; difficulty?: Difficulty; durationMinutes: number; desiredTeamCount: number; teams: Team[]; startsAt?: string; endsAt?: string; winnerTeamIds: string[]; redirectToMatchId?: string }
interface Question { id: string; slug: string; title: string; difficulty: string; tags: { name: string }[] }
interface AbilityPuzzle { id: string; prompt: string; options: string[] | null; responseType: "CHOICE" | "TEXT" }

export default function TeamMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  const router = useRouter();
  const { token, user, isAuthenticated, isLoading } = useAuthStore();
  const [match, setMatch] = useState<Match | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);
  const [abilityPuzzle, setAbilityPuzzle] = useState<AbilityPuzzle | null>(null);
  const [abilityMessage, setAbilityMessage] = useState("");
  const [abilityBusy, setAbilityBusy] = useState(false);
  const [abilityAnswer, setAbilityAnswer] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, "x-player-name": user?.username ?? "Player" }), [token, user?.username]);
  const myTeam = match?.teams.find((team) => team.players.some((player) => player.userId === user?.id));
  const me = myTeam?.players.find((player) => player.userId === user?.id);
  const isLeader = myTeam?.leaderId === user?.id;
  const targetTeam = match?.teams.find((team) => team.id === myTeam?.draftsForTeamId);

  const matchUrl = `${TEAM_API}/api/matches/${matchId}`;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
    if (!token) return;
    const controller = new AbortController();
    fetch(matchUrl, { headers, signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load match");
        return data.match as Match;
      })
      .then(setMatch)
      .catch((reason) => {
        if (reason.name !== "AbortError") {
          setError(
            reason instanceof TypeError
              ? "Team service is unavailable on port 3002. Start the workspace services and try again."
              : reason.message,
          );
        }
      });
    return () => controller.abort();
  }, [token, isAuthenticated, isLoading, matchUrl, router, headers]);

  useEffect(() => {
    if (!token) return;
    const refresh = () => {
      setNow(Date.now());
      fetch(matchUrl, { headers })
        .then((response) => response.ok ? response.json() : null)
        .then((data) => { if (data?.match) setMatch(data.match); })
        .catch(() => undefined);
    };
    const initial = window.setTimeout(refresh, 0);
    const timer = window.setInterval(refresh, 2000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [token, matchUrl, headers]);

  useEffect(() => {
    if (match?.redirectToMatchId) {
      router.replace(`/teams/${match.redirectToMatchId}`);
    }
  }, [match?.redirectToMatchId, router]);

  useEffect(() => {
    if (match?.status !== "DRAFTING" || !isLeader || questions.length) return;
    fetch(`${TEAM_API}/api/matches/${matchId}/questions`, { headers })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; })
      .then((data) => setQuestions(data.questions ?? []))
      .catch((reason) => setError(reason.message));
  }, [match?.status, isLeader, matchId, headers, questions.length]);

  async function mutate(path: string, body: object) {
    setError("");
    try {
      const response = await fetch(`${TEAM_API}/api/matches/${matchId}${path}`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "That action did not work");
      setMatch(data.match);
    } catch (reason) {
      setError(
        reason instanceof TypeError
          ? "Team service is unavailable on port 3002. Start the workspace services and try again."
          : reason instanceof Error
            ? reason.message
            : "That action did not work",
      );
    }
  }

  async function loadAbilityPuzzle() {
    setAbilityBusy(true);
    try {
      const response = await fetch(`${TEAM_API}/api/matches/${matchId}/ability/puzzle`, { headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load puzzle");
      setAbilityPuzzle(data.puzzle);
    } catch (reason) {
      setAbilityMessage(reason instanceof Error ? reason.message : "Could not load puzzle");
    } finally {
      setAbilityBusy(false);
    }
  }

  async function activateAbility() {
    setAbilityBusy(true);
    setAbilityMessage("");
    try {
      const response = await fetch(`${TEAM_API}/api/matches/${matchId}/ability/activate`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not activate Final 5%");
      setMatch(data.match);
      await loadAbilityPuzzle();
    } catch (reason) {
      setAbilityMessage(reason instanceof Error ? reason.message : "Could not activate Final 5%");
    } finally {
      setAbilityBusy(false);
    }
  }

  async function answerAbility(option?: number) {
    if (!abilityPuzzle) return;
    setAbilityBusy(true);
    setAbilityMessage("");
    try {
      const response = await fetch(`${TEAM_API}/api/matches/${matchId}/ability/answer`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzleId: abilityPuzzle.id,
          ...(option !== undefined ? { option } : { answerText: abilityAnswer }),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not submit answer");
      if (data.result.correct) {
        setAbilityMessage(`Correct · +1 point · Blitz score ${data.result.abilityScore}`);
        setAbilityPuzzle(null);
        setAbilityAnswer("");
        await loadAbilityPuzzle();
        await fetch(matchUrl, { headers }).then((value) => value.json()).then((value) => setMatch(value.match));
      } else {
        setAbilityMessage(data.result.explanation ? `Not quite · ${data.result.explanation}` : "Not quite · try again");
      }
    } catch (reason) {
      setAbilityMessage(reason instanceof Error ? reason.message : "Could not submit answer");
    } finally {
      setAbilityBusy(false);
    }
  }

  async function copyInviteCode() {
    try {
      await navigator.clipboard.writeText(match?.inviteCode ?? "");
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      setError("Could not copy the invite code. Please copy it manually.");
    }
  }

  const secondsLeft = match?.endsAt ? Math.max(0, Math.ceil((Date.parse(match.endsAt) - now) / 1000)) : 0;
  const clock = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const abilityUnlockSeconds = Math.ceil((match?.durationMinutes ?? 0) * 60 * 0.05);

  if (isLoading || !match) return <div className="team-loading">{error || "Opening the arena…"}</div>;

  return (
    <div className="arena-page">
      <header className="arena-header">
        <div>
          <Link href="/teams">← Team matches</Link>
          <button
            type="button"
            className="arena-invite-code"
            onClick={copyInviteCode}
            aria-label={`Copy invite code ${match.inviteCode}`}
            title="Copy invite code"
          >
            <span aria-live="polite">{inviteCopied ? "COPIED!" : "INVITE CODE"}</span>
            <b>{match.inviteCode}</b>
          </button>
        </div>
        <h1>{match.name}</h1>
        <div className="arena-stage"><span>{match.status}</span>{match.difficulty && <span>{match.difficulty}</span>}{match.status === "LIVE" && <strong>{clock}</strong>}</div>
      </header>
      {error && <div className="arena-alert" role="alert">{error}</div>}

      {match.status === "LOBBY" && (
        <section className="lobby-panel">
          <div className="arena-intro"><span className="team-kicker">STEP 1 · BUILD YOUR SQUAD</span><h2>Bring your team together.</h2><p>Share the invite code and gather 3–8 players. Opponent search stays locked until your squad is ready and selects a difficulty.</p></div>
          <div className={`arena-team-grid count-${match.teams.length}`}>
            {match.teams.map((team) => (
              <article className={`arena-team-card ${myTeam?.id === team.id ? "mine" : ""}`} key={team.id} style={{ "--team-color": team.color } as React.CSSProperties}>
                <div className="arena-team-title"><span>{team.name.slice(-1)}</span><div><h3>{team.name}</h3><small>{team.players.length}/8 players {team.players.length < 3 ? `· needs ${3 - team.players.length}` : "· ready"}</small></div></div>
                <ul>{team.players.map((player) => <li key={player.userId}><span>{player.username.slice(0, 1).toUpperCase()}</span>{player.username}{player.userId === user?.id && <em>YOU</em>}</li>)}</ul>
                <button onClick={() => mutate("/join", { teamId: team.id })} disabled={myTeam?.id === team.id || team.players.length >= 8}>{myTeam?.id === team.id ? "You’re in this squad ✓" : "Join this squad"}</button>
                <div className="team-vote"><small>TEAM VOTE</small><b>{team.difficultyVote ?? "Waiting…"}</b></div>
              </article>
            ))}
          </div>
          {myTeam && <div className="difficulty-vote"><div><span className="team-kicker">STEP 2 · CHOOSE THE LEVEL</span><h2>{myTeam.players.length >= 3 ? "Pick the challenge level" : `Add ${3 - myTeam.players.length} more player${3 - myTeam.players.length === 1 ? "" : "s"}`}</h2><p>Any squad member can choose or change the difficulty. Your squad stays open after choosing.</p></div><div>{(["EASY", "MEDIUM", "TOUGH"] as Difficulty[]).map((level) => <button key={level} disabled={myTeam.players.length < 3} className={myTeam.difficultyVote === level ? "active" : ""} onClick={() => mutate("/difficulty", { difficulty: level })}>{level}<small>{level === "EASY" ? "Warm up" : level === "MEDIUM" ? "Stay sharp" : "Go all in"}</small></button>)}</div></div>}
          {myTeam && myTeam.players.length >= 3 && myTeam.difficultyVote && (
            <div className="start-matchmaking-card">
              <div><span className="team-kicker">STEP 3 · WHEN YOUR SQUAD IS COMPLETE</span><h2>{user?.id === match.createdBy ? "Ready to find opponents?" : "Waiting for the squad creator"}</h2><p>{user?.id === match.createdBy ? "More players can still join, up to 8. Start only when you are happy with the roster." : "The person who created this squad will start global matchmaking when everyone is ready."}</p></div>
              {user?.id === match.createdBy && <button onClick={() => mutate("/start-matchmaking", {})}>Start game · Find opponents ↗</button>}
            </div>
          )}
        </section>
      )}

      {match.status === "MATCHMAKING" && (
        <section className="matchmaking-panel">
          <div className="matchmaking-radar" aria-hidden="true"><span /><span /><span /><b>{match.teams[0]?.players.length}</b></div>
          <span className="team-kicker">GLOBAL MATCHMAKING · {match.difficulty}</span>
          <h2>Finding worthy opponents…</h2>
          <p>Your squad is ready. We’re searching globally for {match.desiredTeamCount - 1} more team{match.desiredTeamCount - 1 === 1 ? "" : "s"} at the same difficulty. Ratings do not affect the match.</p>
          <div className="queued-squad"><b>{match.teams[0]?.name}</b><span>{match.teams[0]?.players.length} players ready</span></div>
        </section>
      )}

      {match.status === "DRAFTING" && (
        <section className="draft-panel">
          <div className="arena-intro"><span className="team-kicker">LEADERS CHOSEN · DRAFT IN PROGRESS</span><h2>{isLeader ? `Pick for ${targetTeam?.name}.` : "Your leader is choosing."}</h2><p>{isLeader ? `Select exactly ${targetTeam?.players.length} questions. They will be shuffled across the opponent team.` : `${myTeam?.players.find((player) => player.userId === myTeam.leaderId)?.username ?? "Your leader"} is at the draft table.`}</p></div>
          <div className="leader-strip">{match.teams.map((team) => { const leader = team.players.find((player) => player.userId === team.leaderId); const target = match.teams.find((candidate) => candidate.id === team.draftsForTeamId); return <div key={team.id} style={{ "--team-color": team.color } as React.CSSProperties}><span>{leader?.username.slice(0, 1).toUpperCase()}</span><p><b>{leader?.username}</b><small>{team.name} leader · drafting for {target?.name}</small></p><em>{team.selectedQuestionIds.length ? "LOCKED ✓" : "CHOOSING"}</em></div>; })}</div>
          {isLeader && !myTeam?.selectedQuestionIds.length && <><div className="question-draft-grid">{questions.map((question, index) => { const active = selected.includes(question.id); return <button className={active ? "selected" : ""} key={question.id} onClick={() => setSelected((current) => active ? current.filter((id) => id !== question.id) : current.length < (targetTeam?.players.length ?? 0) ? [...current, question.id] : current)}><span>{String(index + 1).padStart(2, "0")}</span><h3>{question.title}</h3><div>{question.tags.slice(0, 2).map((tag) => <small key={tag.name}>{tag.name}</small>)}</div><b>{active ? "Selected ✓" : "Select question"}</b></button>; })}</div><div className="draft-action"><span>{selected.length} / {targetTeam?.players.length} selected</span><button disabled={selected.length !== targetTeam?.players.length} onClick={() => mutate("/draft", { questionIds: selected })}>Lock opponent questions ↗</button></div></>}
        </section>
      )}

      {(match.status === "LIVE" || match.status === "FINISHED") && (
        <section className="live-panel">
          <div className="score-hero"><div><span className="team-kicker">{match.status === "FINISHED" ? "FINAL SCORE" : "ROUND IN PROGRESS"}</span><h2>{match.status === "FINISHED" ? (match.winnerTeamIds.length > 1 ? "It’s a tie." : `${match.teams.find((team) => team.id === match.winnerTeamIds[0])?.name} wins!`) : "Solve yours. Lift the team."}</h2></div>{match.status === "LIVE" && <strong>{clock}</strong>}</div>
          <div className={`score-grid count-${match.teams.length}`}>{[...match.teams].sort((a, b) => b.score - a.score).map((team, index) => <article key={team.id} style={{ "--team-color": team.color } as React.CSSProperties}><header><span>#{index + 1}</span><div><h3>{team.name}</h3><small>{team.players.filter((player) => player.solvedAt).length}/{team.players.length} solved</small></div><strong>{team.score.toFixed(0)}</strong></header><ul>{team.players.map((player) => <li key={player.userId}><div><span>{player.username.slice(0, 1).toUpperCase()}</span><p><b>{player.username}</b><small>{player.questionTitle}</small></p></div><strong>{player.score.toFixed(0)}</strong></li>)}</ul></article>)}</div>
          {match.status === "LIVE" && secondsLeft > 0 && secondsLeft <= abilityUnlockSeconds && isLeader && !myTeam?.abilityActivatedAt && <div className="ability-unlock"><div><span className="team-kicker">SPECIAL ABILITY UNLOCKED · FINAL 5%</span><h2>Risk the code. Chase the points.</h2><p>Optional: activate an endless one-point puzzle blitz for the final 5% of this match. The moment you activate it, normal coding locks for every member of {myTeam?.name} until time expires.</p></div><div><button onClick={activateAbility} disabled={abilityBusy}>{abilityBusy ? "Activating…" : "Activate Final 5% ↗"}</button><small>You may keep coding and ignore this ability.</small></div></div>}
          {match.status === "LIVE" && myTeam?.abilityActivatedAt && <div className="ability-active"><div className="ability-active-heading"><div><span className="team-kicker">FINAL 5% ACTIVE · CODING LOCKED</span><h2>{isLeader ? "One puzzle. One point. Keep moving." : "Your leader took the Final 5% wager."}</h2><p>{isLeader ? `Every correct answer adds one point to ${myTeam.name}.` : "Normal coding is locked for your whole team. Follow the live score while your leader plays the puzzle blitz."}</p></div><strong>+{myTeam.abilityPuzzleScore ?? 0}</strong></div>{isLeader && <div className="ability-puzzle">{abilityPuzzle ? <><p>{abilityPuzzle.prompt}</p>{abilityPuzzle.responseType === "CHOICE" && abilityPuzzle.options ? <div>{abilityPuzzle.options.map((option, index) => <button key={`${abilityPuzzle.id}-${index}`} onClick={() => answerAbility(index)} disabled={abilityBusy}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div> : <form onSubmit={(event) => { event.preventDefault(); answerAbility(); }}><input value={abilityAnswer} onChange={(event) => setAbilityAnswer(event.target.value)} placeholder="Type your answer" required autoComplete="off" /><button disabled={abilityBusy || !abilityAnswer.trim()}>{abilityBusy ? "Checking…" : "Submit answer →"}</button></form>}</> : <button className="ability-next" onClick={loadAbilityPuzzle} disabled={abilityBusy}>{abilityBusy ? "Loading…" : "Load next puzzle →"}</button>}{abilityMessage && <small>{abilityMessage}</small>}</div>}</div>}
          {match.status === "LIVE" && me?.questionSlug && !myTeam?.abilityActivatedAt && <div className="my-assignment"><div><span className="team-kicker">YOUR ASSIGNMENT</span><h2>{me.questionTitle}</h2><p>Chosen by your opponents. Every passing test adds to {myTeam?.name}’s score.</p></div><Link href={`/problems/${me.questionSlug}?teamMatchId=${match.id}`}>Open coding workspace ↗</Link></div>}
        </section>
      )}
    </div>
  );
}
