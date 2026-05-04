import { cookies } from "next/headers";
import { verifyAdminCookie, verifyOfficialCookie, verifySiteCookie } from "@/lib/auth/session";

/** Admin or game official — allowed to record pool stats and run live match controls. */
export async function getCanRecordPool(): Promise<boolean> {
  const c = await cookies();
  if (await verifyAdminCookie(c.get("admin_session")?.value)) return true;
  return verifyOfficialCookie(c.get("official_session")?.value);
}

/**
 * Site (viewer), admin, or official — used by pool live/leaderboard API routes so client
 * `fetch` with cookies works for everyone who can open the public bracket, not only `site_session`.
 */
export async function verifyPoolLiveReadCookies(): Promise<boolean> {
  const c = await cookies();
  if (await verifySiteCookie(c.get("site_session")?.value)) return true;
  if (await verifyAdminCookie(c.get("admin_session")?.value)) return true;
  return verifyOfficialCookie(c.get("official_session")?.value);
}
