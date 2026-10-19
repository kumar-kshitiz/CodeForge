"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const syncTheme = () => {
      setThemeState(
        document.documentElement.dataset.theme === "dark" ? "dark" : "light",
      );
    };

    syncTheme();
    window.addEventListener("codeforge-theme-change", syncTheme);
    return () =>
      window.removeEventListener("codeforge-theme-change", syncTheme);
  }, []);

  const setTheme = (nextTheme: Theme) => {
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem("codeforge-theme", nextTheme);
    window.dispatchEvent(new Event("codeforge-theme-change"));
  };

  return { theme, setTheme };
}
