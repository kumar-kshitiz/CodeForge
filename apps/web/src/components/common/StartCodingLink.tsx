"use client";

import Link from "next/link";
import { useAuthStore } from "../../store/authStore";

export default function StartCodingLink() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <button type="button" className="btn-primary-lg" disabled aria-busy="true">
        Let’s get coding ↗
      </button>
    );
  }

  return (
    <Link href={isAuthenticated ? "/problems" : "/register"} className="btn-primary-lg">
      Let’s get coding ↗
    </Link>
  );
}
