// components/audit/AuditRunsTable.tsx

type AuditRunRow = {
  id: string;
  status: string;
  message: string | null;
  createdAt: Date | string;
};

export default function AuditRunsTable({ runs }: { runs: AuditRunRow[] }) {
  if (!runs?.length) {
    return <p className="text-sm text-slate-400">Aucun audit pour l’instant.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-950">
          <tr>
            <th className="p-3 text-left font-medium text-slate-200">Date</th>
            <th className="p-3 text-left font-medium text-slate-200">Statut</th>
            <th className="p-3 text-left font-medium text-slate-200">Message</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-t border-slate-800">
              <td className="p-3 text-slate-300">
                {new Date(r.createdAt).toLocaleString("fr-CA")}
              </td>
              <td className="p-3">
                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-slate-900 text-slate-200 border border-slate-700">
                  {r.status}
                </span>
              </td>
              <td className="p-3 text-slate-400">{r.message ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
