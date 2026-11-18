import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "session";
const SESSION_DAYS = 30;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { id: hash(token), userId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** The logged-in admin, or null. Expired sessions are deleted on read. */
export async function getAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { id: hash(token) }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session.user;
}

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hash(token) } });
  jar.delete(SESSION_COOKIE);
}

/**
 * Client IP for the login throttle. Never trust the first X-Forwarded-For entry: the client
 * controls it, and nginx's $proxy_add_x_forwarded_for only appends the real address at the end.
 * Prefer X-Real-IP (nginx sets it to $remote_addr), otherwise the last X-Forwarded-For entry.
 */
export function clientIp(h: { get(name: string): string | null }) {
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  const last = h.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return last || "unknown";
}

// In-memory login throttle: 5 failed attempts per key per 15 minutes.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const PRUNE_AT = 1000;

export function isThrottled(key: string, now = Date.now()) {
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) return false;
  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailure(key: string, now = Date.now()) {
  // Drop expired entries now and then so the map can't grow without bound.
  if (attempts.size >= PRUNE_AT) {
    for (const [k, e] of attempts) if (e.resetAt < now) attempts.delete(k);
  }
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count += 1;
}

export function clearFailures(key: string) {
  attempts.delete(key);
}
