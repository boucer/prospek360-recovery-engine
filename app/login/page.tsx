"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-black/10 p-6">
        <h1 className="text-2xl font-semibold">Connexion</h1>
        <p className="mt-2 text-sm text-gray-600">
          Connecte-toi pour accéder au Recovery Engine.
        </p>

        <button
          className="mt-6 w-full rounded-xl bg-black text-white py-3 font-medium"
          onClick={() => signIn("google", { callbackUrl: "/" })}
        >
          Continuer avec Google
        </button>
      </div>
    </main>
  );
}
