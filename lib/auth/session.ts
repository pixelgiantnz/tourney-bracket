import { SignJWT, jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set (min 16 chars) in production");
    }
    return new TextEncoder().encode("dev-insecure-session-secret");
  }
  return new TextEncoder().encode(s);
}

const SITE = "site" as const;
const ADMIN = "admin" as const;

export async function signSiteCookie(): Promise<string> {
  return new SignJWT({ role: SITE })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function signAdminCookie(): Promise<string> {
  return new SignJWT({ role: ADMIN })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySiteCookie(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.role === SITE;
  } catch {
    return false;
  }
}

export async function verifyAdminCookie(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload.role === ADMIN;
  } catch {
    return false;
  }
}

