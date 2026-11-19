import { headers } from "next/headers";
import { ApiKeys } from "@/components/admin/ApiKeys";
import { clientIp, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "API-nøkler" };

export default async function ApiKeysPage() {
  await requireAdmin();
  const h = await headers();
  const [keys, logs] = await Promise.all([
    db.apiKey.findMany({ orderBy: [{ revokedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }], omit: { hash: true } }),
    db.apiAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3100";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const ip = clientIp(h);

  return (
    <ApiKeys
      baseUrl={`${proto}://${host}`}
      myIp={ip === "unknown" ? null : ip}
      initialKeys={keys.map((k) => ({
        id: k.id, name: k.name, prefix: k.prefix, allowedIps: k.allowedIps, createdAt: k.createdAt.toISOString(),
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null, lastUsedIp: k.lastUsedIp, revoked: Boolean(k.revokedAt),
      }))}
      logs={logs.map((l) => ({ id: l.id, keyName: l.keyName, ip: l.ip, method: l.method, path: l.path, summary: l.summary, status: l.status, at: l.createdAt.toISOString() }))}
    />
  );
}
