"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function MobileNavMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!open) return;
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div ref={rootRef} className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
        className="
          inline-flex items-center justify-center
          rounded-xl border border-white/10 bg-white/5
          px-3 py-2
          hover:bg-white/10 active:scale-[0.98]
        "
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          className="text-white"
        >
          <path
            d="M4 6h16M4 12h16M4 18h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open ? (
        <div
          className="
            absolute right-0 top-14 z-50 w-[240px]
            rounded-2xl border border-white/10
            bg-slate-950/95 backdrop-blur
            shadow-[0_20px_60px_rgba(0,0,0,0.55)]
            p-2
          "
        >
          <MenuLink href="/recovery" label="Dashboard (Recovery)" onClick={() => setOpen(false)} />
          <MenuLink href="/audit" label="Audit" onClick={() => setOpen(false)} />
          <MenuLink href="/autopilot" label="Auto-Pilot" onClick={() => setOpen(false)} />

          <div className="my-2 h-px bg-white/10" />

          <MenuLink href="/" label="Accueil" onClick={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="
        block rounded-xl px-3 py-2
        text-sm font-semibold text-white/80
        hover:bg-white/5 hover:text-white
      "
    >
      {label}
    </Link>
  );
}
