"use client";

import { useState } from "react";

export default function TenantForm({ tenant }: { tenant?: any }) {
  const [form, setForm] = useState({
    name: tenant?.name ?? "",
    slug: tenant?.slug ?? "",
    logoUrl: tenant?.logoUrl ?? "",
    emailFrom: tenant?.emailFrom ?? "",
    smsFrom: tenant?.smsFrom ?? "",
    isActive: tenant?.isActive ?? true,
  });

  async function save() {
    await fetch("/api/admin/tenants", {
      method: tenant ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, id: tenant?.id }),
    });

    location.href = "/admin/tenants";
  }

  return (
    <div className="p-8 max-w-xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">
        {tenant ? "Modifier tenant" : "Nouveau tenant"}
      </h1>

      {Object.entries(form).map(([k, v]) =>
        typeof v === "boolean" ? (
          <label key={k} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={v}
              onChange={e => setForm({ ...form, [k]: e.target.checked })}
            />
            {k}
          </label>
        ) : (
          <input
            key={k}
            placeholder={k}
            className="w-full rounded-lg bg-white/5 p-2"
            value={v}
            onChange={e => setForm({ ...form, [k]: e.target.value })}
          />
        )
      )}

      <button
        onClick={save}
        className="rounded-lg bg-red-600 px-4 py-2 text-white"
      >
        Sauvegarder
      </button>
    </div>
  );
}
