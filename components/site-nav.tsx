"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const linkClass =
  "rounded-md px-2 py-1.5 text-sm text-muted transition hover:bg-muted/50 hover:text-foreground";
const activeClass = "bg-muted/20 font-medium text-foreground";

function navLinkClass(active: boolean) {
  return [linkClass, active ? activeClass : null].filter(Boolean).join(" ");
}

export function SiteNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (pathname?.startsWith("/admin")) return null;

  /** Active styles only after mount so server HTML matches client hydration (avoids usePathname mismatch). */
  const tournamentsActive =
    mounted && (pathname === "/" || pathname?.startsWith("/t/"));
  const playersActive =
    mounted &&
    (pathname === "/players" || pathname?.startsWith("/players/"));

  return (
    <header className="border-b border-border bg-card/40">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight text-foreground">
          Tourney Bracket
        </Link>
        <nav className="flex flex-wrap items-center gap-1" aria-label="Main">
          <Link
            href="/"
            className={navLinkClass(tournamentsActive)}
            aria-current={tournamentsActive ? "page" : undefined}
          >
            Tournaments
          </Link>
          <Link
            href="/players"
            className={navLinkClass(playersActive)}
            aria-current={playersActive ? "page" : undefined}
          >
            Players
          </Link>
        </nav>
      </div>
    </header>
  );
}
