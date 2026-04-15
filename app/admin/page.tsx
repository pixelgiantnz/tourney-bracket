import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-2 text-muted">
        Manage the global player list, then create tournaments and build brackets.
      </p>
      <ul className="mt-8 space-y-3 text-accent">
        <li>
          <Link href="/admin/players" className="underline underline-offset-4 hover:opacity-90">
            Players
          </Link>
          <span className="ml-2 text-foreground">— names and avatars</span>
        </li>
        <li>
          <Link href="/admin/tournaments" className="underline underline-offset-4 hover:opacity-90">
            Tournaments
          </Link>
          <span className="ml-2 text-foreground">— teams, seeds, bracket</span>
        </li>
      </ul>
    </div>
  );
}
