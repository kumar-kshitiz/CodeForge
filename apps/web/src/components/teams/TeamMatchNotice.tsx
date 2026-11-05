"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTeamRealtime } from "@/hooks/useTeamRealtime";
import { useAuthStore } from "@/store/authStore";
import { formatTeamScore } from "@/utils/teamScore";

interface NoticeTeam {
  id: string;
  name: string;
  score: number;
  leaderId?: string;
  abilityActivatedAt?: string;
  players: { userId: string }[];
}
interface NoticeMatch {
  id: string;
  status: string;
  durationMinutes: number;
  endsAt?: string;
  winnerTeamIds: string[];
  teams: NoticeTeam[];
}

export default function TeamMatchNotice({ matchId }: { matchId?: string }) {
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?.id);
  const [match, setMatch] = useState<NoticeMatch | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useTeamRealtime<NoticeMatch>(matchId ? token : null, matchId, setMatch, setError);

  useEffect(() => {
    if (!matchId || match?.status !== "LIVE") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [matchId, match?.status]);

  if (!matchId || !match) return null;
  const myTeam = match.teams.find((team) =>
    team.players.some((player) => player.userId === userId),
  );
  if (!myTeam) return null;

  const secondsLeft = match.endsAt
    ? Math.max(0, Math.ceil((Date.parse(match.endsAt) - now) / 1000))
    : 0;
  const powerSurgeWindowSeconds = Math.ceil(match.durationMinutes * 60 * 0.1);
  const powerSurgeAvailable =
    match.status === "LIVE" &&
    secondsLeft > 0 &&
    secondsLeft <= powerSurgeWindowSeconds &&
    myTeam.leaderId === userId &&
    !myTeam.abilityActivatedAt;
  const clock = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  if (match.status === "FINISHED") {
    const winners = match.teams.filter((team) => match.winnerTeamIds.includes(team.id));
    return (
      <aside className="team-workspace-notice finished" role="status" aria-live="polite">
        <div>
          <small>MATCH FINISHED</small>
          <strong>{winners.length > 1 ? "It’s a tie" : `${winners[0]?.name ?? "Winner"} wins`}</strong>
          <span>{match.teams.map((team) => `${team.name} ${formatTeamScore(team.score)}`).join(" · ")}</span>
        </div>
        <Link href={`/teams/${match.id}`}>Final scoreboard →</Link>
      </aside>
    );
  }

  if (match.status !== "LIVE") return null;
  return (
    <aside className={`team-workspace-notice ${powerSurgeAvailable ? "urgent" : ""}`} role="status">
      <div>
        <small>{powerSurgeAvailable ? "POWER SURGE UNLOCKED · FINAL 10%" : myTeam.name}</small>
        <strong>{powerSurgeAvailable ? "Power Surge is ready" : clock}</strong>
        {error && <span>{error}</span>}
      </div>
      <Link href={`/teams/${match.id}`}>
        {powerSurgeAvailable ? "Open & activate →" : "Team arena →"}
      </Link>
    </aside>
  );
}
