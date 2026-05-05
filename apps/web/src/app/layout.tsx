import type { Metadata } from 'next';
import './globals.css';
import Navbar from '../components/common/Navbar';
import AuthInitializer from '../components/common/AuthInitializer';

export const metadata: Metadata = {
  title: 'CodeForge — Collaborative Interview Rooms',
  description: 'Real-time collaborative code editor for technical interviews. Built with Socket.IO, Monaco Editor, and Redis.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthInitializer />
        <Navbar />
        <main className="layout-main">
          {children}
        </main>
      </body>
    </html>
  );
}
