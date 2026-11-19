import { beforeEach, describe, expect, it, vi } from "vitest";
import { ipAllowed, normalizeIp, parseIpList } from "@/lib/ip-list";

type Key = { id: number; name: string; hash: string; allowedIps: string[]; revokedAt: Date | null };
const keys: Key[] = [];
const updates: unknown[] = [];

vi.mock("@/lib/db", () => ({
  db: {
    apiKey: {
      findUnique: async ({ where }: { where: { hash: string } }) => keys.find((k) => k.hash === where.hash) ?? null,
      update: async (args: unknown) => { updates.push(args); return null; },
    },
  },
}));

const { authenticateApi, generateApiKey, hashApiKey } = await import("@/lib/api-auth");

let nextIp = 1;
// A fresh IP per test so the in-memory failure throttle doesn't leak between tests
const freshIp = () => `10.9.${Math.floor(nextIp / 250)}.${(nextIp++ % 250) + 1}`;
const headers = (h: Record<string, string>) => new Headers(h);

function addKey(allowedIps: string[] = [], revoked = false) {
  const k = generateApiKey();
  keys.push({ id: keys.length + 1, name: `key ${keys.length + 1}`, hash: k.hash, allowedIps, revokedAt: revoked ? new Date() : null });
  return k.key;
}

beforeEach(() => { updates.length = 0; });

describe("parseIpList", () => {
  it("accepts IPv4, IPv6 and CIDR, one per line or comma separated", () => {
    expect(parseIpList("1.2.3.4\n10.0.0.0/8, 2001:db8::/32  ::1")).toEqual({ ok: true, ips: ["1.2.3.4", "10.0.0.0/8", "2001:db8::/32", "::1"] });
  });
  it("normalizes IPv4-mapped IPv6 and removes duplicates", () => {
    expect(parseIpList(["::ffff:1.2.3.4", "1.2.3.4"])).toEqual({ ok: true, ips: ["1.2.3.4"] });
  });
  it("treats empty input as an empty list", () => {
    expect(parseIpList("  \n ")).toEqual({ ok: true, ips: [] });
  });
  it("rejects invalid addresses and masks", () => {
    expect(parseIpList("1.2.3")).toEqual({ ok: false, error: "Ugyldig IP-adresse: 1.2.3" });
    expect(parseIpList("1.2.3.4/33").ok).toBe(false);
    expect(parseIpList("::1/129").ok).toBe(false);
    expect(parseIpList("1.2.3.4/8/1").ok).toBe(false);
    expect(parseIpList("example.com").ok).toBe(false);
  });
});

describe("ipAllowed", () => {
  it("allows everyone with an empty list", () => expect(ipAllowed("8.8.8.8", [])).toBe(true));
  it("matches exact addresses and subnets", () => {
    const list = ["1.2.3.4", "10.0.0.0/8", "2001:db8::/32"];
    expect(ipAllowed("1.2.3.4", list)).toBe(true);
    expect(ipAllowed("1.2.3.5", list)).toBe(false);
    expect(ipAllowed("10.200.1.1", list)).toBe(true);
    expect(ipAllowed("2001:db8:1::5", list)).toBe(true);
    expect(ipAllowed("2001:db9::5", list)).toBe(false);
  });
  it("matches IPv4 seen as IPv4-mapped IPv6", () => {
    expect(normalizeIp("::FFFF:1.2.3.4")).toBe("1.2.3.4");
    expect(ipAllowed("::ffff:1.2.3.4", ["1.2.3.4"])).toBe(true);
  });
  it("rejects garbage", () => expect(ipAllowed("unknown", ["1.2.3.4"])).toBe(false));
});

describe("generateApiKey", () => {
  it("makes a long random key and stores only its hash", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.key).toMatch(/^pf_[A-Za-z0-9_-]{43}$/);
    expect(a.key).not.toBe(b.key);
    expect(a.hash).toBe(hashApiKey(a.key));
    expect(a.hash).not.toContain(a.key);
    expect(a.key.startsWith(a.prefix)).toBe(true);
  });
});

describe("authenticateApi", () => {
  it("rejects a missing or malformed Authorization header", async () => {
    expect(await authenticateApi(headers({ "x-real-ip": freshIp() }))).toMatchObject({ ok: false, status: 401 });
    expect(await authenticateApi(headers({ "x-real-ip": freshIp(), authorization: "Basic abc" }))).toMatchObject({ ok: false, status: 401 });
    expect(await authenticateApi(headers({ "x-real-ip": freshIp(), authorization: "Bearer not-a-key" }))).toMatchObject({ ok: false, status: 401 });
  });

  it("rejects an unknown key and a revoked key", async () => {
    const revoked = addKey([], true);
    expect(await authenticateApi(headers({ "x-real-ip": freshIp(), authorization: "Bearer pf_unknown" }))).toMatchObject({ ok: false, status: 401 });
    expect(await authenticateApi(headers({ "x-real-ip": freshIp(), authorization: `Bearer ${revoked}` }))).toMatchObject({ ok: false, status: 401 });
  });

  it("accepts a valid key from any IP when the list is empty, and records the use", async () => {
    const key = addKey();
    const ip = freshIp();
    const res = await authenticateApi(headers({ "x-real-ip": ip, authorization: `Bearer ${key}` }));
    expect(res).toMatchObject({ ok: true, caller: { ip } });
    expect(updates).toHaveLength(1);
    expect(JSON.stringify(updates[0])).toContain(ip);
  });

  it("enforces the IP whitelist and fails closed without a known client IP", async () => {
    const key = addKey(["192.168.1.0/24"]);
    expect(await authenticateApi(headers({ "x-real-ip": "192.168.1.20", authorization: `Bearer ${key}` }))).toMatchObject({ ok: true });
    expect(await authenticateApi(headers({ "x-real-ip": "192.168.2.20", authorization: `Bearer ${key}` }))).toMatchObject({ ok: false, status: 403 });
    expect(await authenticateApi(headers({ authorization: `Bearer ${key}` }))).toMatchObject({ ok: false, status: 403 });
  });

  it("uses the last X-Forwarded-For entry, not the client-controlled first one", async () => {
    const key = addKey(["5.5.5.5"]);
    expect(await authenticateApi(headers({ "x-forwarded-for": "5.5.5.5, 6.6.6.6", authorization: `Bearer ${key}` }))).toMatchObject({ ok: false, status: 403 });
    expect(await authenticateApi(headers({ "x-forwarded-for": "6.6.6.6, 5.5.5.5", authorization: `Bearer ${key}` }))).toMatchObject({ ok: true });
  });

  it("throttles an IP after 20 failed keys", async () => {
    const ip = freshIp();
    const now = Date.now();
    for (let i = 0; i < 20; i++) await authenticateApi(headers({ "x-real-ip": ip, authorization: "Bearer pf_wrong" }), now);
    const key = addKey();
    expect(await authenticateApi(headers({ "x-real-ip": ip, authorization: `Bearer ${key}` }), now)).toMatchObject({ ok: false, status: 429 });
    expect(await authenticateApi(headers({ "x-real-ip": ip, authorization: `Bearer ${key}` }), now + 16 * 60 * 1000)).toMatchObject({ ok: true });
  });

  it("limits each key to 120 requests per minute", async () => {
    const key = addKey();
    const ip = freshIp();
    const now = Date.now();
    for (let i = 0; i < 120; i++) expect((await authenticateApi(headers({ "x-real-ip": ip, authorization: `Bearer ${key}` }), now)).ok).toBe(true);
    expect(await authenticateApi(headers({ "x-real-ip": ip, authorization: `Bearer ${key}` }), now)).toMatchObject({ ok: false, status: 429 });
    expect((await authenticateApi(headers({ "x-real-ip": ip, authorization: `Bearer ${key}` }), now + 61 * 1000)).ok).toBe(true);
  });
});
