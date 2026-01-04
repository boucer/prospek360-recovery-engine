export default function ActivationPage() {
  return (
    <main className="p-8 space-y-6 pb-[120px] md:pb-8">
      <h1 className="text-2xl font-semibold">Activation</h1>
      <p className="mt-2 opacity-80">
        Appliquer tags / pipeline GHL et déclencher les séquences.
      </p>

      <div className="mt-6 rounded-xl border p-4">
        <div className="font-medium">Actions V1</div>
        <ul className="mt-2 list-disc pl-5 opacity-80">
          <li>Tagger les contacts “RECOVERY_READY”</li>
          <li>Créer / déplacer opportunités dans un pipeline</li>
          <li>Envoyer un premier message (template V1)</li>
        </ul>
      </div>
    </main>
  );
}
