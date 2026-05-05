'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await fetch(`${API}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      logout();
      router.push('/');
    }
  };

  return (
    <nav className="global-nav">
      <div className="nav-container">
        <Link href="/" className="nav-logo">
          CF
          <span className="nav-logo-text">CodeForge</span>
        </Link>
        
        <div className="nav-links">
          {!isLoading && isAuthenticated ? (
            <>
              <Link href="/rooms" className="nav-link">Rooms</Link>
              <Link href="/contests" className="nav-link">Contests</Link>
              <Link href="/problems" className="nav-link">Problems</Link>
              
              <div className="nav-profile">
                <span className="profile-name">{user?.username}</span>
                <button onClick={handleLogout} className="btn-ghost-sm">Logout</button>
              </div>
            </>
          ) : !isLoading && !isAuthenticated ? (
            <>
              <Link href="/login" className="btn-ghost-sm">Log in</Link>
              <Link href="/register" className="btn-primary-sm">Sign Up</Link>
            </>
          ) : (
            <div className="nav-loading-placeholder" />
          )}
        </div>
      </div>
    </nav>
  );
}
