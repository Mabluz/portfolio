"use server";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clearFailures, clientIp, createSession, destroySession, isThrottled, recordFailure } from "@/lib/auth";
import { db } from "@/lib/db";

// Compared against when the user does not exist, so timing doesn't reveal valid usernames.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("not-a-real-password", 12));

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const key = clientIp(await headers());
  if (isThrottled(key)) return { error: "For mange forsøk. Prøv igjen om en stund." };

  const user = username ? await db.adminUser.findUnique({ where: { username } }) : null;
  const ok = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) {
    recordFailure(key);
    return { error: "Feil brukernavn eller passord." };
  }

  clearFailures(key);
  await createSession(user.id);
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}
