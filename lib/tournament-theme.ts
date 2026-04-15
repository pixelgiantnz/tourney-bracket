import { z } from "zod";

export type PublicAppearance = "light" | "dark" | "neon";

const tournamentThemeSchema = z.object({
  appearance: z.enum(["light", "dark", "neon"]),
});

/** Defaults to light so public brackets match the site shell unless explicitly set to dark. */
export function parsePublicAppearance(theme: unknown | null | undefined): PublicAppearance {
  if (theme == null) return "light";
  const parsed = tournamentThemeSchema.safeParse(theme);
  if (!parsed.success) return "light";
  return parsed.data.appearance;
}
