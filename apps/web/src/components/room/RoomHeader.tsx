'use client';

import { useState } from 'react';

interface RoomHeaderProps {
  title: string;
  roomId: string;
}

export default function RoomHeader({ title, roomId }: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="room-header">
      <div className="room-header-left">
        <div className="logo-mark">CF</div>
        <div className="room-info">
          <h1 className="room-title">{title}</h1>
          <span className="room-id">#{roomId.slice(0, 8)}</span>
        </div>
      </div>
      <button className="copy-btn" onClick={copyLink}>
        {copied ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Share Link
          </>
        )}
      </button>
    </div>
  );
}
