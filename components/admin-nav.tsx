import Link from "next/link";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { logoutAdminAction, logoutSiteAction } from "@/lib/auth/actions";

export function AdminNav() {
  return (
    <header className="border-b border-border bg-card/50">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/admin" className="font-medium text-foreground">
            Admin
          </Link>
          <Link href="/admin/players" className="text-muted hover:text-foreground">
            Players
          </Link>
          <Link href="/admin/tournaments" className="text-muted hover:text-foreground">
            Tournaments
          </Link>
          <Link href="/" className="text-muted hover:text-foreground">
            Home
          </Link>
        </nav>
        <div className="flex gap-2">
          <form action={logoutAdminAction}>
            <PendingSubmitButton className="rounded border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground">
              Admin out
            </PendingSubmitButton>
          </form>
          <form action={logoutSiteAction}>
            <PendingSubmitButton className="rounded border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground">
              Site out
            </PendingSubmitButton>
          </form>
        </div>
      </div>
    </header>
  );
}
