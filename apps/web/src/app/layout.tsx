import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CodeForge — Collaborative Interview Rooms',
  description: 'Real-time collaborative code editor for technical interviews. Built with Socket.IO, Monaco Editor, and Redis.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
