"use client";

export default function DrilldownStatusBar({
  focus,
  autoSelect,
  mode,
}: {
  focus: string;
  autoSelect: string;
  mode: string;
}) {
  return (
    <div
      className="
        mb-6 rounded-xl border
        border-white/10
        bg-slate-900/60
        px-4 py-3
        text-white/70
        backdrop-blur
      "
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="opacity-80">🔎 Drilldown actif</span>
      </div>

      <div className="mt-1 text-xs text-white/50">
        Focus : <span className="text-white/70">{focus}</span> • AutoSelect :{" "}
        <span className="text-white/70">{autoSelect}</span> • Mode :{" "}
        <span className="text-white/70">{mode}</span>
      </div>
    </div>
  );
}
