"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type TenantInput = {
  id?: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  emailFrom?: string | null;
  smsFrom?: string | null;
  isActive: boolean;
};

export default function TenantFormClient({
  mode,
  initial,
}: {
  mode: "new" | "edit";
  initial?: TenantInput;
}) {
  const router = useRouter();

  const [form, setForm] = useState<TenantInput>({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    logoUrl: initial?.logoUrl ?? "",
    emailFrom: initial?.emailFrom ?? "",
    smsFrom: initial?.smsFrom ?? "",
    isActive: initial?.isActive ?? true,
  });

  const [saving, setSaving] = useState(false);

  function update<K extends keyof TenantInput>(key: K, value: TenantInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(
        mode === "new"
          ? "/api/admin/tenants"
          : `/api/admin/tenants/${initial?.id}`,
        {
          method: mode === "new" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      if (!res.ok) throw new Error("Erreur sauvegarde");

      router.push("/admin/tenants");
      router.refresh();
    } catch (e) {
      alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  function handleLogoUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      update("logoUrl", reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto w-full max-w-[900px] px-6 py-10 text-white">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          {/* HEADER */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold">
              {mode === "new" ? "Nouveau tenant" : "Modifier le tenant"}
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Le tenant représente une entreprise cliente.  
              Il définit le <strong>branding</strong>, les <strong>emails</strong>,
              les <strong>SMS</strong> et les <strong>templates Auto-Pilot</strong>.
            </p>
          </div>

          {/* FORM */}
          <div className="space-y-5">
            <Field
              label="Nom de l’entreprise"
              hint="Nom affiché dans l’interface et les rapports."
              value={form.name}
              onChange={(v) => update("name", v)}
            />

            <Field
              label="Slug"
              hint="Identifiant interne (utilisé par cookie / routing). Exemple : ericbouchard"
              value={form.slug}
              onChange={(v) => update("slug", v)}
            />

            {/* LOGO */}
            <div>
              <label className="block text-sm font-medium">Logo</label>
              <p className="mb-2 text-xs text-white/60">
                Logo affiché dans l’app, emails et exports. PNG ou JPG recommandé.
              </p>

              {form.logoUrl && (
                <img
                  src={form.logoUrl}
                  alt="Logo"
                  className="mb-3 h-16 rounded bg-white p-2"
                />
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  e.target.files && handleLogoUpload(e.target.files[0])
                }
                className="block w-full text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold hover:file:bg-white/20"
              />
            </div>

            <Field
              label="Email expéditeur"
              hint="Adresse utilisée pour les emails envoyés au nom du client."
              value={form.emailFrom ?? ""}
              onChange={(v) => update("emailFrom", v)}
            />

            <Field
              label="SMS expéditeur"
              hint="Nom ou numéro affiché comme expéditeur SMS."
              value={form.smsFrom ?? ""}
              onChange={(v) => update("smsFrom", v)}
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => update("isActive", e.target.checked)}
              />
              Tenant actif
            </label>
          </div>

          {/* ACTIONS */}
          <div className="mt-8 flex justify-between">
            <button
              onClick={() => router.push("/admin/tenants")}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
            >
              Annuler / Retour
            </button>

            <button
              disabled={saving}
              onClick={handleSave}
              className="rounded-xl bg-red-500 px-6 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50"
            >
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- UI helpers ---------- */

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      {hint && <p className="mb-1 text-xs text-white/60">{hint}</p>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm outline-none focus:border-red-400"
      />
    </div>
  );
}
