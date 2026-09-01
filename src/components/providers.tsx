"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MotionConfig } from "framer-motion";
import { SWRConfig } from "swr";
import { api, swrFetcher } from "@/lib/client";
import { THEME_STORAGE_KEY } from "@/lib/constants";
import { useAuthStore } from "@/stores/app";
import { ToastHost } from "@/components/ui/toast";
import type { ThemePref } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Theme                                                                */
/* ------------------------------------------------------------------ */

interface ThemeCtx {
  theme: ThemePref;
  setTheme: (t: ThemePref) => void;
  resolved: "light" | "dark";
}

const ThemeContext = createContext<ThemeCtx>({ theme: "system", setTheme: () => {}, resolved: "dark" });

export function useTheme() {
  return useContext(ThemeContext);
}

function applyTheme(resolved: "light" | "dark") {
  document.documentElement.dataset.theme = resolved;
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const stored = (localStorage.getItem(THEME_STORAGE_KEY) as ThemePref | null) ?? "system";
    setThemeState(stored);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const compute = (pref: ThemePref) => (pref === "dark" ? "dark" : pref === "light" ? "light" : media.matches ? "dark" : "light");
    const r = compute(stored);
    setResolved(r);
    applyTheme(r);

    const onChange = (e: MediaQueryListEvent) => {
      const current = (localStorage.getItem(THEME_STORAGE_KEY) as ThemePref | null) ?? "system";
      if (current === "system") {
        const next = e.matches ? "dark" : "light";
        setResolved(next);
        applyTheme(next);
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((t: ThemePref) => {
    setThemeState(t);
    localStorage.setItem(THEME_STORAGE_KEY, t);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const r = t === "dark" ? "dark" : t === "light" ? "light" : media.matches ? "dark" : "light";
    setResolved(r);
    applyTheme(r);
    api("/api/user", { method: "PATCH", body: { action: "settings", theme: t } }).catch(() => {});
  }, []);

  const value = useMemo(() => ({ theme, setTheme, resolved }), [theme, setTheme, resolved]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/* ------------------------------------------------------------------ */
/* Auth                                                                 */
/* ------------------------------------------------------------------ */

function AuthProvider({ children }: { children: ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setStatus = useAuthStore((s) => s.setStatus);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{ user: never }>("/api/auth");
        if (!cancelled) setUser(data.user);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setStatus("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser, setStatus]);

  return <>{children}</>;
}

/* ------------------------------------------------------------------ */
/* Combined providers                                                   */
/* ------------------------------------------------------------------ */

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: swrFetcher,
        dedupingInterval: 5000,
        revalidateOnFocus: true,
        shouldRetryOnError: false,
        errorRetryCount: 1,
        keepPreviousData: true,
      }}
    >
      <MotionConfig reducedMotion="user">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <ToastHost />
          </AuthProvider>
        </ThemeProvider>
      </MotionConfig>
    </SWRConfig>
  );
}
