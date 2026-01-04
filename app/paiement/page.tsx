export default function PaiementPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Paiement</h1>
      <p className="mt-2 opacity-80">
        Activation Premium / paiement (Stripe) — étape suivante.
      </p>

      <div className="mt-6 rounded-xl border p-4">
        <button className="rounded-lg bg-black text-white px-4 py-2">
          Continuer vers le paiement
        </button>
      </div>
    </main>
  );
}
