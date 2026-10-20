"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import CodePlayground from "../../components/common/CodePlayground";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace("/problems");
  }, [isLoading, isAuthenticated, router]);

  // Keep guest forms hidden until the existing session has been checked.
  if (isLoading || isAuthenticated) {
    return (
      <div className="empty-state" role="status">
        {isLoading ? "Checking your session…" : "Opening your challenges…"}
      </div>
    );
  }

  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <span className="eyebrow">WELCOME TO YOUR CODING HAPPY PLACE</span>
        <h2>
          Stay curious.
          <br />
          Build confidence.
          <br />
          <em>Make it click.</em>
        </h2>
        <CodePlayground />
        <p>Practice at your own pace. Learn something with every attempt.</p>
      </aside>
      {children}
    </div>
  );
}
