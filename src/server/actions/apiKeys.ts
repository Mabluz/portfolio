"use server";
import { revalidatePath } from "next/cache";
import { generateApiKey } from "@/lib/api-auth";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseIpList } from "@/lib/ip-list";
import type { ActionResult } from "./projects";

const PAGE = "/admin/api";

/** Creates a key and returns it once. Only its hash is stored, so it can't be shown again. */
export async function createApiKey(name: unknown, ips: unknown): Promise<ActionResult<{ key: string }>> {
  await requireAdmin();
  const label = typeof name === "string" ? name.trim() : "";
  if (!label) return { ok: false, error: "Gi nøkkelen et navn" };
  if (label.length > 60) return { ok: false, error: "Navnet kan være maks 60 tegn" };
  const parsed = parseIpList(typeof ips === "string" ? ips : "");
  if (!parsed.ok) return parsed;
  const { key, hash, prefix } = generateApiKey();
  await db.apiKey.create({ data: { name: label, hash, prefix, allowedIps: parsed.ips } });
  revalidatePath(PAGE);
  return { ok: true, key };
}

export async function updateApiKeyIps(id: unknown, ips: unknown): Promise<ActionResult<{ ips: string[] }>> {
  await requireAdmin();
  if (!Number.isInteger(id)) return { ok: false, error: "Ugyldig nøkkel" };
  const parsed = parseIpList(typeof ips === "string" ? ips : "");
  if (!parsed.ok) return parsed;
  const res = await db.apiKey.updateMany({ where: { id: id as number, revokedAt: null }, data: { allowedIps: parsed.ips } });
  if (res.count === 0) return { ok: false, error: "Fant ikke en aktiv nøkkel" };
  revalidatePath(PAGE);
  return { ok: true, ips: parsed.ips };
}

export async function revokeApiKey(id: unknown): Promise<ActionResult> {
  await requireAdmin();
  if (!Number.isInteger(id)) return { ok: false, error: "Ugyldig nøkkel" };
  await db.apiKey.updateMany({ where: { id: id as number, revokedAt: null }, data: { revokedAt: new Date() } });
  revalidatePath(PAGE);
  return { ok: true };
}
