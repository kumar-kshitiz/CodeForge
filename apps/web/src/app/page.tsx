'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="nav-logo">CF</div>
        <div className="nav-links">
          <button className="btn-ghost-sm" onClick={() => router.push('/rooms')}>
            Rooms
          </button>
          <button className="btn-primary-sm" onClick={() => router.push('/rooms')}>
            Get Started
          </button>
        </div>
      </nav>

      <main className="landing-hero">
        <div className="hero-glow" />
        <div className="hero-content">
          <span className="hero-chip">Phase 3 · Realtime Collaboration</span>
          <h1 className="hero-heading">
            Code Together,<br />
            <span className="gradient-text">Hire Smarter</span>
          </h1>
          <p className="hero-desc">
            Real-time collaborative code editor for technical interviews.
            Powered by Socket.IO, Monaco, and Redis.
          </p>
          <div className="hero-actions">
            <button className="btn-primary-lg" onClick={() => router.push('/rooms')}>
              Open Interview Rooms
            </button>
          </div>
        </div>

        <div className="editor-preview">
          <div className="editor-chrome">
            <div className="chrome-dots">
              <span /><span /><span />
            </div>
            <span className="chrome-title">main.py · CodeForge</span>
          </div>
          <div className="editor-body">
            <div className="code-line"><span className="kw">def</span> <span className="fn">two_sum</span><span className="punc">(nums, target):</span></div>
            <div className="code-line indent"><span className="kw">  seen</span> <span className="punc">= {}</span></div>
            <div className="code-line indent"><span className="kw">  for</span> i, n <span className="kw">in</span> <span className="fn">enumerate</span>(nums):</div>
            <div className="code-line indent2"><span className="kw">    if</span> target - n <span className="kw">in</span> seen:</div>
            <div className="code-line indent3"><span className="kw">      return</span> [seen[target - n], i]</div>
            <div className="code-line indent2">seen[n] = i</div>
            <div className="code-cursor" />
          </div>
        </div>
      </main>

      <section className="features">
        {[
          { icon: '⚡', title: 'Sub-100ms Sync', desc: 'Throttled code broadcast via Socket.IO rooms' },
          { icon: '👥', title: 'Live Presence', desc: 'See who is in the room with avatar indicators' },
          { icon: '💾', title: 'Auto-Save', desc: 'Debounced snapshots saved to PostgreSQL every 3s' },
          { icon: '🔄', title: 'Reconnect', desc: 'Seamless rejoining with Redis-cached code state' },
        ].map((f) => (
          <div key={f.title} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <h3 className="feature-title">{f.title}</h3>
            <p className="feature-desc">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
