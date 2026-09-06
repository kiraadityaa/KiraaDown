"use client";

import { useCallback, useEffect, useState } from "react";
import { Moon, Sun } from "@phosphor-icons/react";

export const THEME_KEY = "kiraadown-theme";
const THEME_EVENT = "kiraadown-theme-change";

function readDark(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.classList.contains("dark");
}

function applyDark(dark: boolean): void {
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch {
    /* abaikan */
  }
  window.dispatchEvent(new CustomEvent<boolean>(THEME_EVENT, { detail: dark }));
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
  // Default gelap, sinkron dengan skrip tema di layout sebelum paint.
  const [dark, setDark] = useState(true);

  useEffect(() => {
    // Sinkronisasi state dengan sistem eksternal (class di <html>), kasus valid untuk effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(readDark());
    const onChange = (e: Event) => setDark((e as CustomEvent<boolean>).detail);
    window.addEventListener(THEME_EVENT, onChange);
    return () => window.removeEventListener(THEME_EVENT, onChange);
  }, []);

  const toggle = useCallback(() => {
    const next = !readDark();
    setDark(next);
    applyDark(next);
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Ganti ke tema terang" : "Ganti ke tema gelap"}
      title={dark ? "Tema terang" : "Tema gelap"}
      className={`w-10 h-10 grid place-items-center rounded-full border border-black/15 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10 transition shrink-0 ${className}`}
    >
      <span className="relative block h-[18px] w-[18px]" aria-hidden="true">
        <Sun
          size={18}
          className={`absolute inset-0 transition-all duration-200 ${dark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"}`}
        />
        <Moon
          size={18}
          className={`absolute inset-0 transition-all duration-200 ${dark ? "opacity-0 rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"}`}
        />
      </span>
    </button>
  );
}
