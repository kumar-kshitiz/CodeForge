"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";

const TEAM_API =
  process.env.NEXT_PUBLIC_TEAM_COMPETITION_URL ?? "http://localhost:3002";

interface CurrentMatch {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  status: string;
  difficulty?: string;
  desiredTeamCount: number;
  teams: { players: unknown[] }[];
}

export default function TeamCompetitionsPage() {
  const router = useRouter();
  const { token, user, isAuthenticated, isLoading } = useAuthStore();
  const [name, setName] = useState("Friday Code Clash");
  const [teamCount, setTeamCount] = useState(2);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<CurrentMatch | null>(null);
  const [currentLoading, setCurrentLoading] = useState(true);
  const [confirmDestroy, setConfirmDestroy] = useState(false);
  const [destroying, setDestroying] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [error, setError] = useState("");

  const headers = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    "x-player-name": user?.username ?? "Player",
  }), [token, user?.username]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
      return;
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetch(`${TEAM_API}/api/matches/mine`, { headers, signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not restore your active squad");
        return response.json();
      })
      .then((data) => setCurrentMatch(data.match ?? null))
      .catch((reason) => {
        if (reason.name !== "AbortError") setError(reason.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCurrentLoading(false);
      });
    return () => controller.abort();
  }, [token, headers]);

  async function createMatch(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const response = await fetch(`${TEAM_API}/api/matches`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name, teamCount, durationMinutes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create match");
      router.push(`/teams/${data.match.id}`);
    } catch (reason) {
      setError(
        reason instanceof TypeError
          ? "Team service is unavailable on port 3002. Start the workspace services and try again."
          : reason instanceof Error
            ? reason.message
            : "Could not create match",
      );
    } finally {
      setCreating(false);
    }
  }

  async function joinMatch(event: React.FormEvent) {
    event.preventDefault();
    setJoining(true);
    setError("");
    try {
      const response = await fetch(`${TEAM_API}/api/matches/join-by-code`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: joinCode.trim().toUpperCase() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not join squad");
      router.push(`/teams/${data.match.id}`);
    } catch (reason) {
      setError(
        reason instanceof TypeError
          ? "Team service is unavailable on port 3002. Start the workspace services and try again."
          : reason instanceof Error
            ? reason.message
            : "Could not join squad",
      );
    } finally {
      setJoining(false);
    }
  }

  async function destroySquad() {
    if (!currentMatch) return;
    setDestroying(true);
    setError("");
    try {
      const response = await fetch(`${TEAM_API}/api/matches/${currentMatch.id}`, {
        method: "DELETE",
        headers,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not destroy squad");
      }
      setCurrentMatch(null);
      setConfirmDestroy(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not destroy squad");
    } finally {
      setDestroying(false);
    }
  }

  async function copyInviteCode() {
    if (!currentMatch) return;
    try {
      await navigator.clipboard.writeText(currentMatch.inviteCode);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      setError("Could not copy the invite code. Please copy it manually.");
    }
  }

  if (isLoading || !isAuthenticated) {
    return <div className="team-loading">Preparing the team arena…</div>;
  }

  return (
    <div className="team-hub">
      <header className="team-hub-hero">
        <div>
          <span className="team-kicker">NEW MULTIPLAYER MODE · 3–8 PER TEAM</span>
          <h1>
            Compete in teams.
            <br />
            <span>Win it together.</span>
          </h1>
          <p>
            Agree on a level, trust your randomly chosen leader, and solve the
            questions your opponents picked for you before the clock runs out.
          </p>
        </div>
        <div className="team-orbit" aria-hidden="true">
          <span>A</span><i>VS</i><span>B</span>
        </div>
      </header>

      <section className="team-hub-grid">
        {currentLoading ? (
          <div className="team-create-card team-current-card"><span className="team-card-index">01 / YOUR SQUAD</span><h2>Restoring your squad…</h2></div>
        ) : currentMatch ? (
          <article className="team-create-card team-current-card">
            <span className="team-card-index">01 / CONTINUE YOUR SQUAD</span>
            <div className="current-squad-status"><span>{currentMatch.status}</span>{currentMatch.difficulty && <span>{currentMatch.difficulty}</span>}</div>
            <h2>{currentMatch.name}</h2>
            <p>{currentMatch.teams[0]?.players.length ?? 0}/8 players · Looking for {currentMatch.desiredTeamCount} teams</p>
            <button
              type="button"
              className="current-squad-code"
              onClick={copyInviteCode}
              aria-label={`Copy invite code ${currentMatch.inviteCode}`}
              title="Copy invite code"
            >
              <small aria-live="polite">{inviteCopied ? "COPIED!" : "INVITE CODE · CLICK TO COPY"}</small>
              <strong>{currentMatch.inviteCode}</strong>
            </button>
            <button className="team-primary-button" onClick={() => router.push(`/teams/${currentMatch.id}`)}>Continue squad ↗</button>
            {user?.id === currentMatch.createdBy && ["LOBBY", "MATCHMAKING"].includes(currentMatch.status) && (
              <div className="destroy-squad-action">
                {confirmDestroy ? <><p>This removes the squad for every member. This cannot be undone.</p><div><button type="button" onClick={() => setConfirmDestroy(false)}>Keep squad</button><button type="button" onClick={destroySquad} disabled={destroying}>{destroying ? "Destroying…" : "Yes, destroy squad"}</button></div></> : <button type="button" onClick={() => setConfirmDestroy(true)}>Destroy this squad</button>}
              </div>
            )}
          </article>
        ) : (
        <form className="team-create-card" onSubmit={createMatch}>
          <span className="team-card-index">01 / CREATE A SQUAD</span>
          <h2>Start from scratch</h2>
          <label>
            Match name
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} />
          </label>
          <div className="team-form-row">
            <label>
              Teams
              <select value={teamCount} onChange={(event) => setTeamCount(Number(event.target.value))}>
                {[2, 3, 4].map((count) => <option key={count} value={count}>{count} teams</option>)}
              </select>
            </label>
            <label>
              Round time
              <select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))}>
                {[15, 30, 45, 60, 90].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
              </select>
            </label>
          </div>
          <button className="team-primary-button" disabled={creating}>
            {creating ? "Creating squad…" : "Create squad ↗"}
          </button>
        </form>
        )}

        <form className="team-join-card" onSubmit={joinMatch}>
          <span className="team-card-index">02 / JOIN A SQUAD</span>
          <h2>Have an invite code?</h2>
          <p>Ask the squad creator for the private code, enter it below, and join your teammates directly.</p>
          <label>
            Squad invite code
            <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="E.G. A1B2C3D4E5" minLength={6} maxLength={16} autoComplete="off" />
          </label>
          <button className="team-primary-button" disabled={joining || joinCode.trim().length < 6}>
            {joining ? "Joining squad…" : "Join the game ↗"}
          </button>
        </form>
      </section>
      {error && <p className="team-error team-hub-error" role="alert">{error}</p>}

      <section className="team-flow-card team-flow-wide">
        <span className="team-card-index">03 / PRIVATE SQUADS, GLOBAL OPPONENTS</span>
        <ol>
          <li><b>Build privately</b><span>The creator shares the code with 3–8 teammates. Squads are never publicly listed.</span></li>
          <li><b>Choose when ready</b><span>Any member picks difficulty; only the creator can start searching.</span></li>
          <li><b>Match globally</b><span>Only started squads enter the indexed queue. Difficulty matters; rating does not.</span></li>
          <li><b>Race together</b><span>Random leaders draft questions, assignments shuffle, and the highest score wins.</span></li>
        </ol>
      </section>
    </div>
  );
}
