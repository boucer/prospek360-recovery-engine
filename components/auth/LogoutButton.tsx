"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton({
  className = "",
  label = "Déconnexion",
  callbackUrl = "/",
}: {
  className?: string;
  label?: string;
  callbackUrl?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl })}
      className={className}
    >
      {label}
    </button>
  );
}
