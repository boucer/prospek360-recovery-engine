"use client";

import { useEffect } from "react";

type ToastTone = "success" | "info" | "warning" | "danger";

export function Toast({
  message,
  onClose,
  duration = 3800, // ✅ plus visible par défaut
  tone = "info",
}: {
  message: string;
  onClose: () => void;
  duration?: number;
  tone?: ToastTone;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  const toneStyles: Record<
    ToastTone,
    { border: string; bg: string; text: string; glow: string; icon: string }
  > = {
    success: {
      border: "border-emerald-400/40",
      bg: "bg-slate-900",
      text: "text-emerald-200",
      glow: "shadow-[0_0_0_2px_rgba(16,185,129,0.25),0_0_30px_rgba(16,185,129,0.25)]",
      icon: "🎯",
    },
    info: {
      border: "border-slate-500/40",
      bg: "bg-slate-900",
      text: "text-slate-200",
      glow: "shadow-lg",
      icon: "ℹ️",
    },
    warning: {
      border: "border-amber-400/40",
      bg: "bg-slate-900",
      text: "text-amber-200",
      glow: "shadow-[0_0_0_2px_rgba(251,191,36,0.25),0_0_30px_rgba(251,191,36,0.25)]",
      icon: "⚠️",
    },
    danger: {
      border: "border-red-400/40",
      bg: "bg-slate-900",
      text: "text-red-200",
      glow: "shadow-[0_0_0_2px_rgba(248,113,113,0.25),0_0_30px_rgba(248,113,113,0.25)]",
      icon: "❌",
    },
  };

  const s = toneStyles[tone];

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-toast-in">
      <div
        className={`rounded-xl border px-4 py-3 text-sm backdrop-blur ${s.border} ${s.bg} ${s.text} ${s.glow}`}
      >
        <span className="mr-2">{s.icon}</span>
        {message}
      </div>
    </div>
  );
}
