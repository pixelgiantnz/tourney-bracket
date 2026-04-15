import { timingSafeEqual } from "node:crypto";

export function safeComparePassword(input: string, expected: string): boolean {
  try {
    const a = Buffer.from(input, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
