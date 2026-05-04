"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signSiteCookie, signAdminCookie, signOfficialCookie } from "@/lib/auth/session";
import { safeComparePassword } from "@/lib/auth/password";

export type AuthFormState = { error: string | null };

export async function loginSiteAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  const expected = process.env.SITE_PASSWORD ?? "";
  if (!expected || !safeComparePassword(password, expected)) {
    return { error: "Invalid password" };
  }
  const token = await signSiteCookie();
  const c = await cookies();
  c.set("site_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect(next.startsWith("/") ? next : "/");
}

export async function logoutSiteAction() {
  const c = await cookies();
  c.delete("site_session");
  redirect("/login");
}

export async function loginAdminAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected || !safeComparePassword(password, expected)) {
    return { error: "Invalid password" };
  }
  const token = await signAdminCookie();
  const c = await cookies();
  c.set("admin_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect(next.startsWith("/") ? next : "/admin");
}

export async function logoutAdminAction() {
  const c = await cookies();
  c.delete("admin_session");
  redirect("/admin/login");
}

export async function loginOfficialAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  const expected = process.env.OFFICIAL_PASSWORD ?? "";
  if (!expected || !safeComparePassword(password, expected)) {
    return { error: "Invalid password" };
  }
  const token = await signOfficialCookie();
  const c = await cookies();
  c.set("official_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect(next.startsWith("/") ? next : "/");
}

export async function logoutOfficialAction() {
  const c = await cookies();
  c.delete("official_session");
  redirect("/official/login");
}
