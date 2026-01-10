// app/(app)/layout.tsx
import Link from "next/link";
import Image from "next/image";
import MobileNavMenu from "@/components/layout/MobileNavMenu";
import LogoutButton from "@/components/auth/LogoutButton";

const HEADER_CONTAINER = "mx-auto w-full max-w-[1500px] px-6 lg:px-8";
const BODY_CONTAINER = "mx-auto w-full max-w-[1500px] p-6 lg:p-8";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className={HEADER_CONTAINER}>
          <div className="flex h-14 items-center justify-between gap-3">
            {/* LEFT */}
            <div className="flex items-center gap-5">
              <Link href="/recovery" className="flex items-center gap-3">
                <Image
                  src="/brand/prospek360.png"
                  alt="Prospek 360"
                  width={140}
                  height={36}
                  className="h-7 w-auto"
                  priority
                />
                <span className="hidden text-xs text-white/40 sm:inline">
                  Recovery Engine
                </span>
              </Link>

              {/* Desktop navigation */}
              <nav className="hidden items-center gap-1 sm:flex">
                <NavItem href="/recovery" label="Recovery" />
                <NavItem href="/audit" label="Audit" />
                <NavItem href="/autopilot" label="Auto-Pilot" />
              </nav>
            </div>

            {/* RIGHT */}
            <div className="relative flex items-center gap-2">
              {/* Mobile hamburger ONLY */}
              <div className="sm:hidden">
                <MobileNavMenu />
              </div>

              {/* Accueil — DESKTOP ONLY */}
              <Link
                href="/"
                className="
                  hidden sm:inline-flex
                  rounded-xl border border-white/10
                  bg-white/5 px-3 py-2
                  text-sm font-semibold
                  hover:bg-white/10
                "
              >
                Accueil
              </Link>

              {/* ✅ Déconnexion — DESKTOP ONLY */}
              <div className="hidden sm:inline-flex">
                <LogoutButton
                  callbackUrl="/"
                  className="
                    rounded-xl border border-red-400/20
                    bg-red-500/10 px-3 py-2
                    text-sm font-semibold text-red-200
                    hover:bg-red-500/20
                  "
                  label="Déconnexion"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* BODY */}
      <main className={BODY_CONTAINER}>{children}</main>
    </div>
  );
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl px-3 py-2 text-sm font-semibold text-white/70 hover:bg-white/5 hover:text-white"
    >
      {label}
    </Link>
  );
}
