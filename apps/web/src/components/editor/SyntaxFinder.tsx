"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { findContextualSyntax, type SyntaxContext } from "../../data/contextualSyntax";
import { normalizeSyntaxKeyword } from "../../data/cpp20Syntax";
import { normalizePythonKeyword } from "../../data/pythonSyntax";
import { normalizeJavascriptKeyword } from "../../data/javascriptSyntax";
import {
  syntaxLanguageNames,
  syntaxReference,
  type SupportedSyntaxLanguage,
  type SyntaxEntry,
} from "../../data/syntaxReference";

type SyntaxFinderProps = {
  language: SupportedSyntaxLanguage;
  onInsert: (syntax: string) => void;
  getContext: () => SyntaxContext;
};

export default function SyntaxFinder({ language, onInsert, getContext }: SyntaxFinderProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery("");
    setCopied(false);
  }, [language]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  const normalizedQuery = language === "cpp" ? normalizeSyntaxKeyword(query)
    : language === "python" ? normalizePythonKeyword(query) : normalizeJavascriptKeyword(query);
  const context = getContext();
  const exactMatch = useMemo(
    () => findContextualSyntax(language, normalizedQuery, context)
      ?? syntaxReference[language].find((entry) => entry.keyword === normalizedQuery),
    [language, normalizedQuery, context.line, context.column],
  );
  const suggestions = useMemo(() => {
    if (!normalizedQuery || exactMatch) return [];
    return syntaxReference[language]
      .filter((entry) => entry.keyword.includes(normalizedQuery))
      .slice(0, 6);
  }, [language, normalizedQuery, exactMatch]);

  const chooseEntry = (entry: SyntaxEntry) => {
    setQuery(entry.keyword);
    setCopied(false);
  };

  const copySyntax = async () => {
    if (!exactMatch) return;
    await navigator.clipboard.writeText(exactMatch.syntax);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="syntax-finder" ref={panelRef}>
      <button
        type="button"
        className="syntax-finder-toggle"
        aria-expanded={open}
        aria-controls="syntax-finder-panel"
        onClick={() => setOpen((current) => !current)}
      >
        Syntax <span aria-hidden="true">⌘</span>
      </button>
      {open && (
        <section id="syntax-finder-panel" className="syntax-finder-panel" aria-label={`${syntaxLanguageNames[language]} syntax finder`}>
          <div className="syntax-finder-heading">
            <div>
              <small>LOCAL REFERENCE</small>
              <strong>{syntaxLanguageNames[language]} syntax</strong>
            </div>
            <button type="button" aria-label="Close syntax finder" onClick={() => setOpen(false)}>×</button>
          </div>
          <label htmlFor="syntax-search">Enter an exact keyword</label>
          <input
            id="syntax-search"
            type="search"
            value={query}
            autoFocus
            autoComplete="off"
            placeholder="Try sort, queue, gcd…"
            onChange={(event) => {
              setQuery(event.target.value);
              setCopied(false);
            }}
          />
          {exactMatch ? (
            <div className="syntax-result" aria-live="polite">
              <div className="syntax-result-title">
                <strong>{exactMatch.keyword}</strong>
                <span>{syntaxLanguageNames[language]}</span>
              </div>
              <pre><code>{exactMatch.syntax}</code></pre>
              <p>{exactMatch.description}</p>
              <div className="syntax-result-actions">
                <button type="button" onClick={() => onInsert(exactMatch.syntax)}>Insert at cursor</button>
                <button type="button" onClick={copySyntax}>{copied ? "Copied ✓" : "Copy"}</button>
              </div>
            </div>
          ) : normalizedQuery ? (
            <div className="syntax-suggestions" aria-live="polite">
              {suggestions.length > 0 ? (
                <>
                  <small>RELATED KEYWORDS</small>
                  <div>
                    {suggestions.map((entry) => (
                      <button type="button" key={entry.keyword} onClick={() => chooseEntry(entry)}>{entry.keyword}</button>
                    ))}
                  </div>
                </>
              ) : <p>{language === "cpp" && normalizedQuery === "find"
                ? "Place your cursor on a container or string declaration, then open Syntax again."
                : `No exact syntax found for “${query.trim()}”.`}</p>}
            </div>
          ) : (
            <div className="syntax-suggestions">
              <p className="syntax-finder-hint">Search a keyword or choose below. C++ lookups can use a declaration on your cursor’s line. Examples use placeholder names.</p>
              <div style={{ maxHeight: 180, overflowY: "auto" }}>
                {syntaxReference[language].map((entry) => (
                  <button type="button" key={entry.keyword} onClick={() => chooseEntry(entry)}>{entry.keyword}</button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
