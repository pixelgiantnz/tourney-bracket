"use client";

import { useFormStatus } from "react-dom";

function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-80 ${className ?? ""}`}
    />
  );
}

export type PendingSubmitButtonProps = Omit<
  React.ComponentPropsWithoutRef<"button">,
  "type" | "children"
> & {
  children: React.ReactNode;
};

/**
 * Submit button that shows a spinner while the parent form action is running.
 * Must be rendered inside the form (useFormStatus).
 */
export function PendingSubmitButton({
  children,
  className = "",
  disabled,
  ...props
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = Boolean(disabled || pending);
  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-busy={pending || undefined}
      className={`inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed ${pending ? "cursor-wait" : ""} ${className}`}
      {...props}
    >
      {pending ? <Spinner /> : null}
      <span className="min-w-0">{children}</span>
    </button>
  );
}
