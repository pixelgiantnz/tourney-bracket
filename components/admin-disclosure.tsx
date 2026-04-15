import type { ReactNode } from "react";

/** Native disclosure panel — no client JS required. */
export function AdminDisclosure({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group mt-10 rounded-lg border border-border bg-card"
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-medium outline-none ring-accent focus-visible:ring-2 [&::-webkit-details-marker]:hidden">
        <span
          className="inline-flex size-6 shrink-0 items-center justify-center rounded border border-border bg-background text-xs text-muted transition-transform duration-200 group-open:rotate-90"
          aria-hidden
        >
          ›
        </span>
        {title}
      </summary>
      <div className="border-t border-border px-4 pb-4 pt-4">{children}</div>
    </details>
  );
}
