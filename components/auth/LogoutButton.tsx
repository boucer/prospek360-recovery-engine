"use client";

import * as React from "react";
import { signOut } from "next-auth/react";

type LogoutButtonProps = {
  callbackUrl?: string;
  className?: string;
  label?: string;
};

export default function LogoutButton({
  callbackUrl = "/",
  className = "",
  label = "Déconnexion",
}: LogoutButtonProps) {
  const [isPending, startTransition] = React.useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => signOut({ callbackUrl }))}
      disabled={isPending}
      className={className}
      aria-busy={isPending}
    >
      {isPending ? "..." : label}
    </button>
  );
}
