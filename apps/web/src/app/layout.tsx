import type { Metadata } from "next";
import "./globals.css";
import "./playful.css";
import Navbar from "../components/common/Navbar";
import AuthInitializer from "../components/common/AuthInitializer";

export const metadata: Metadata = {
  title: "CodeForge — Your next lightbulb moment",
  description:
    "A happy place to practice coding, explore challenges, and improve with thoughtful AI feedback.",
};

const themeScript = `
  try {
    const savedTheme = localStorage.getItem('codeforge-theme');
    const theme = savedTheme === 'light' || savedTheme === 'dark'
      ? savedTheme
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (_) {}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthInitializer />
        <Navbar />
        <main className="layout-main">{children}</main>
      </body>
    </html>
  );
}
