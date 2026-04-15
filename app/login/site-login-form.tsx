"use client";

import { useActionState } from "react";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { loginSiteAction, type AuthFormState } from "@/lib/auth/actions";

const initial: AuthFormState = { error: null };

export function SiteLoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(loginSiteAction, initial);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-foreground outline-none ring-accent focus:ring-2"
        />
      </label>
      {state.error ? (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      <PendingSubmitButton className="w-full rounded-md bg-accent py-2.5 text-sm font-medium text-white hover:opacity-90">
        Continue
      </PendingSubmitButton>
    </form>
  );
}
