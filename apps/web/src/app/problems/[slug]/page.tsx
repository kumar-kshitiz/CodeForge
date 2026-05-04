'use client';

import { useState, useEffect, useRef, use } from 'react';
import Editor from '@monaco-editor/react';
import SubmitPanel from '@/components/room/SubmitPanel';
import { useRoomStore } from '@/store/roomStore';
import { getSocket } from '@/lib/socket';
import { SocketEvent } from '@codeforge/shared-types';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Problem {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  starterCode: Record<string, string>;
  constraints: string[];
  examples: { input: string; output: string; explanation?: string }[];
  tags: { name: string }[];
}

function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('accessToken') ?? '') : '';
}

export default function ProblemWorkspacePage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ contestId?: string }>;
}) {
  const { slug } = use(params);
  const { contestId } = use(searchParams);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);

  // Use the global room store for SubmitPanel to pick up the roomId for real-time updates
  const setRoomId = useRoomStore((s) => s.setRoomId);

  // Autosave draft logic
  const saveDraftTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Generate a unique session room ID for this solo coding session
    const sessionId = `problem-${slug}-${Date.now()}`;
    setRoomId(sessionId);

    const socket = getSocket();
    if (socket) {
      socket.emit(SocketEvent.JOIN_ROOM, { roomId: sessionId });
    }

    return () => {
      setRoomId(null);
      if (socket) {
        socket.emit(SocketEvent.LEAVE_ROOM, { roomId: sessionId });
      }
    };
  }, [slug, setRoomId]);

  useEffect(() => {
    fetch(`${API}/api/problems/${slug}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.problem) setProblem(data.problem);
      })
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
          setCode(problem.starterCode[language] || '');
        }
      });
  }, [problem, language, slug]);

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);

    // Debounced Autosave (1 second)
    if (saveDraftTimeout.current) clearTimeout(saveDraftTimeout.current);
    saveDraftTimeout.current = setTimeout(() => {
      fetch(`${API}/api/problems/${slug}/draft`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ language, code: newCode }),
      }).catch((err) => console.error('Failed to save draft', err));
    }, 1000);
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Workspace...</div>;
  }

  if (!problem) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Problem not found</div>;
  }

  return (
    <div className="workspace-container">
      {/* LEFT PANEL: Problem Details */}
      <div className="workspace-left">
        <div className="problem-header">
          {contestId ? (
            <Link href={`/contests/${contestId}`} className="back-link">← Back to Contest</Link>
          ) : (
            <Link href="/problems" className="back-link">← Back</Link>
          )}
          <h2>{problem.title}</h2>
          <div className="problem-meta">
            <span className={`diff-${problem.difficulty.toLowerCase()} badge`}>{problem.difficulty}</span>
            {problem.tags.map((t) => (
              <span key={t.name} className="tag-badge">{t.name}</span>
            ))}
          </div>
        </div>

        <div className="problem-body">
          <div className="problem-desc" dangerouslySetInnerHTML={{ __html: problem.description.replace(/\n/g, '<br/>') }} />
          
          {problem.examples && problem.examples.length > 0 && (
            <div className="problem-examples">
              <h3>Examples</h3>
              {problem.examples.map((ex, i) => (
                <div key={i} className="example-box">
                  <strong>Input:</strong> <code>{ex.input}</code><br/>
                  <strong>Output:</strong> <code>{ex.output}</code>
                  {ex.explanation && <><br/><strong>Explanation:</strong> {ex.explanation}</>}
                </div>
              ))}
            </div>
          )}

          {problem.constraints && problem.constraints.length > 0 && (
            <div className="problem-constraints">
              <h3>Constraints</h3>
              <ul>
                {problem.constraints.map((c, i) => (
                  <li key={i}><code>{c}</code></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Editor & Submit Panel */}
      <div className="workspace-right">
        <div className="editor-toolbar">
          <select 
            className="lang-select" 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
          </select>
          <span className="save-status text-muted text-sm">Autosaved</span>
        </div>
        
        <div className="editor-wrapper">
          <Editor
            height="100%"
            language={language === 'cpp' ? 'cpp' : language}
            theme="vs-dark"
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

        <div className="workspace-submit-wrapper">
          <SubmitPanel code={code} language={language} problemId={problem.id} contestId={contestId} />
        </div>
      </div>
    </div>
  );
}
