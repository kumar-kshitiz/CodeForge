"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/authStore";
import ThemeToggle from "./ThemeToggle";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await fetch(`${API}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      logout();
      router.push("/");
    }
  };

  return (
    <nav className="global-nav">
      <div className="nav-container">
        <Link href="/" className="nav-logo">
          <span className="brand-mark">{"{↗}"}</span>
          <span className="nav-logo-text">
            CodeForge<span className="brand-dot">.</span>
          </span>
        </Link>

        <div className="nav-links">
          <Link href="/teams" className="nav-link nav-teams">
            Team Battles
          </Link>
          <Link href="/problems" className="nav-link nav-challenges">
            Challenges
          </Link>
          <Link href="/#how-it-works" className="nav-link nav-about">
            How it works
          </Link>
          {(user?.role === "ADMIN" || user?.role === "INTERVIEWER") && (
            <Link href="/admin/problems/new" className="nav-link nav-admin">
              Problem studio
            </Link>
          )}
          {user?.role === "ADMIN" && (
            <Link href="/admin/ability-puzzles/new" className="nav-link nav-admin">
              Ability puzzles
            </Link>
          )}
          <ThemeToggle />
          {!isLoading && isAuthenticated ? (
            <>
              <div className="nav-profile">
                <span className="profile-name">{user?.username}</span>
                <button onClick={handleLogout} className="btn-ghost-sm">
                  Logout
                </button>
              </div>
            </>
          ) : !isLoading && !isAuthenticated ? (
            <>
              <Link href="/login" className="btn-ghost-sm">
                Log in
              </Link>
              <Link href="/register" className="btn-primary-sm">
                Get started ↗
              </Link>
            </>
          ) : (
            <div className="nav-loading-placeholder" />
          )}
        </div>
      </div>
    </nav>
  );
}
