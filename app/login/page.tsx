"use client";

import { Suspense } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function safeCallbackUrl(raw: string | null) {
  if (!raw) return "/recovery";
  // On accepte seulement les chemins relatifs internes
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/recovery";
}

function GoogleMark() {
  // Petit mark inline (évite dépendances)
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      className="h-5 w-5"
      focusable="false"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.1-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.2 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.3 0-9.7-2.9-11.3-7.2l-6.6 5.1C9.4 40.1 16.1 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C39.8 36.6 44 31.8 44 24c0-1.1-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

function LoginCard({ callbackUrl }: { callbackUrl: string }) {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      {/* Glow très subtil */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute top-28 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur">
          <div className="p-7 sm:p-8">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-40">
                <Image
                  src="/brand/prospek360.png"
                  alt="Prospek 360"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <span className="ml-auto inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/80">
                Recovery Engine
              </span>
            </div>

            <h1 className="mt-5 text-2xl font-semibold tracking-tight">
              Connexion
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Connecte-toi pour accéder au tableau de bord et aux décisions
              générées par tes audits.
            </p>

            {/* CTA */}
            <button
              className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-white text-slate-950 py-3 font-semibold shadow-sm transition hover:bg-white/95 active:scale-[0.99]"
              onClick={() => signIn("google", { callbackUrl })}
            >
              <GoogleMark />
              Continuer avec Google
            </button>

            <div className="mt-5 flex items-center justify-between text-xs text-white/50">
              <span>Connexion sécurisée</span>
              <span className="hidden sm:inline">
                Redirection:{" "}
                <span className="text-white/70">{callbackUrl}</span>
              </span>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/60">
              <div className="font-semibold text-white/80">Astuce</div>
              <div className="mt-1 leading-relaxed">
                Si tu reviens d’un lien d’audit, tu seras automatiquement
                redirigé vers la bonne section après la connexion.
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 px-7 py-4 text-[11px] text-white/50">
            © {new Date().getFullYear()} Prospek 360 — Engine Recovery
          </div>
        </div>
      </div>
    </main>
  );
}

function LoginInner() {
  const params = useSearchParams();
  const callbackUrl = safeCallbackUrl(params.get("callbackUrl"));
  return <LoginCard callbackUrl={callbackUrl} />;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8">
            <div className="h-10 w-40 rounded bg-white/10" />
            <div className="mt-6 h-7 w-44 rounded bg-white/10" />
            <div className="mt-3 h-4 w-72 rounded bg-white/10" />
            <div className="mt-6 h-12 w-full rounded-2xl bg-white/10" />
            <div className="mt-6 h-20 w-full rounded-2xl bg-white/10" />
          </div>
        </main>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
