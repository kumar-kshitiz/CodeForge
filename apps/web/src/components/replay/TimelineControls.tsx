import React from 'react';

interface TimelineControlsProps {
  isPlaying: boolean;
  togglePlay: () => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  currentTime: number;
  duration: number;
  scrub: (time: number) => void;
}

export default function TimelineControls({
  isPlaying, togglePlay, playbackSpeed, setPlaybackSpeed, currentTime, duration, scrub
}: TimelineControlsProps) {

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="timeline-controls" style={{ padding: '16px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
        <button onClick={togglePlay} className="btn-primary-sm" style={{ width: 80 }}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div style={{ flex: 1 }} />

        <select 
          value={playbackSpeed} 
          onChange={e => setPlaybackSpeed(Number(e.target.value))}
          style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px' }}
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1.0x</option>
          <option value={2}>2.0x</option>
          <option value={4}>4.0x</option>
        </select>
      </div>

      <div style={{ position: 'relative', height: '24px', display: 'flex', alignItems: 'center' }}>
        <input 
          type="range" 
          min={0} 
          max={duration} 
          value={currentTime}
          onChange={(e) => scrub(Number(e.target.value))}
          style={{ width: '100%', cursor: 'pointer', zIndex: 10, margin: 0, opacity: 0 }}
        />
        <div style={{ position: 'absolute', left: 0, right: 0, height: '4px', background: 'var(--bg-primary)', borderRadius: '2px', pointerEvents: 'none' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', borderRadius: '2px' }} />
        </div>
      </div>
    </div>
  );
}
