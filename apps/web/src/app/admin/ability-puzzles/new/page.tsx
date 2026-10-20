"use client";

import Link from "next/link";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3004";

export default function NewAbilityPuzzlePage() {
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState(0);
  const [hasOptions, setHasOptions] = useState(true);
  const [answerText, setAnswerText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function updateOption(index: number, value: string) {
    setOptions((current) =>
      current.map((option, optionIndex) => optionIndex === index ? value : option),
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const token = localStorage.getItem("accessToken") ?? "";
      const response = await fetch(`${API}/api/ability-puzzles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt,
          ...(hasOptions
            ? { options, correctOption }
            : { answerText }),
          explanation: explanation || undefined,
          status: "ACTIVE",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save puzzle");
      setPrompt("");
      setOptions(["", "", "", ""]);
      setCorrectOption(0);
      setAnswerText("");
      setExplanation("");
      setMessage("Puzzle saved and added to the Final 5% pool.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not save puzzle");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ability-admin-page">
      <header>
        <div><span className="team-kicker">ADMIN · FINAL 5%</span><h1>Create a one-point puzzle.</h1><p>These quick questions appear continuously for leaders who activate the ability during the final 5% of a match.</p></div>
        <Link href="/problems">Back to challenges →</Link>
      </header>
      <form onSubmit={submit}>
        <label>Question or puzzle<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} required minLength={5} rows={4} placeholder="What comes next: 2, 4, 8, 16, …?" /></label>
        <label className="ability-options-toggle"><input type="checkbox" checked={hasOptions} onChange={(event) => setHasOptions(event.target.checked)} />Add multiple-choice options <small>Optional—turn this off for a short text-answer puzzle.</small></label>
        {hasOptions ? <fieldset><legend>Answer options · select the correct one</legend>{options.map((option, index) => <label className="ability-option" key={index}><input type="radio" name="correct" checked={correctOption === index} onChange={() => setCorrectOption(index)} /><span>{String.fromCharCode(65 + index)}</span><input value={option} onChange={(event) => updateOption(index, event.target.value)} required placeholder={`Option ${index + 1}`} /></label>)}</fieldset> : <label>Correct text answer<input className="ability-text-answer" value={answerText} onChange={(event) => setAnswerText(event.target.value)} required placeholder="Accepted answer" /><small>Matching ignores uppercase and lowercase differences.</small></label>}
        <label>Explanation · optional<textarea value={explanation} onChange={(event) => setExplanation(event.target.value)} rows={3} placeholder="A short explanation shown after the answer." /></label>
        <button className="team-primary-button" disabled={saving}>{saving ? "Saving puzzle…" : "Add to Final 5% ↗"}</button>
        {message && <p className="ability-admin-message" role="status">{message}</p>}
      </form>
    </div>
  );
}
