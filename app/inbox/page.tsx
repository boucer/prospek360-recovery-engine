export default function InboxPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Inbox</h1>
      <p className="mt-2 opacity-80">
        Messages centralisés (V1 : structure + affichage simple).
      </p>

      <div className="mt-6 grid grid-cols-12 gap-4">
        <div className="col-span-4 rounded-xl border p-4">
          <div className="font-medium">Conversations</div>
          <div className="mt-3 text-sm opacity-70">
            Aucune conversation (pour l’instant)
          </div>
        </div>

        <div className="col-span-8 rounded-xl border p-4">
          <div className="font-medium">Messages</div>
          <div className="mt-3 text-sm opacity-70">
            Sélectionne une conversation
          </div>
        </div>
      </div>
    </main>
  );
}
