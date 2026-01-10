"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function safeCallbackUrl(raw: string | null) {
  if (!raw) return "/recovery";
  // On accepte seulement les chemins relatifs internes
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/recovery";
}

function LoginInner() {
  const params = useSearchParams();
  const callbackUrl = safeCallbackUrl(params.get("callbackUrl"));

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-black/10 p-6">
        <h1 className="text-2xl font-semibold">Connexion</h1>
        <p className="mt-2 text-sm text-gray-600">
          Connecte-toi pour accéder au Recovery Engine.
        </p>

        <button
          className="mt-6 w-full rounded-xl bg-black text-white py-3 font-medium"
          onClick={() => signIn("google", { callbackUrl })}
        >
          Continuer avec Google
        </button>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-black/10 p-6">
            <div className="h-6 w-40 bg-black/10 rounded" />
            <div className="mt-3 h-4 w-72 bg-black/10 rounded" />
            <div className="mt-6 h-12 w-full bg-black/10 rounded-xl" />
          </div>
        </main>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
