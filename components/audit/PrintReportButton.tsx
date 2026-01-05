"use client";

export default function PrintReportButton() {
  return (
    <button
  onClick={() => window.print()}
  className="
    rounded-xl
    border-2 border-red-600
    bg-slate-950
    px-4 py-2
    text-sm font-semibold
    text-white
    hover:bg-slate-900
    hover:border-red-500
    transition
  "
>
  Imprimer / PDF
</button>

  );
}
