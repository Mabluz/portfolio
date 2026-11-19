import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const audit: Record<string, unknown>[] = [];
let authResult: { ok: true; caller: { id: number; name: string; ip: string } } | { ok: false; status: number; error: string };

vi.mock("@/lib/api-auth", () => ({ authenticateApi: async () => authResult }));
vi.mock("@/lib/db", () => ({ db: { apiAuditLog: { create: async ({ data }: { data: Record<string, unknown> }) => { audit.push(data); } } } }));

const { apiRoute } = await import("@/server/api");
const { ApiError } = await import("@/lib/api-format");

const OK = { ok: true as const, caller: { id: 7, name: "Laptop", ip: "1.2.3.4" } };
const req = (method: string, body?: string, headers: Record<string, string> = { "content-type": "application/json" }) =>
  new Request("http://localhost/api/v1/projects/3", { method, body, headers });

beforeEach(() => {
  audit.length = 0;
  authResult = OK;
});

describe("apiRoute", () => {
  it("stops at authentication and never runs the handler", async () => {
    authResult = { ok: false, status: 401, error: "Ugyldig nøkkel" };
    const handler = vi.fn();
    const res = await apiRoute({ write: false }, handler)(req("GET"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Ugyldig nøkkel" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns JSON with no-store and does not log reads", async () => {
    const res = await apiRoute({ write: false }, async () => ({ body: { hello: 1 } }))(req("GET"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ hello: 1 });
    expect(audit).toHaveLength(0);
  });

  it("passes route params and the parsed body", async () => {
    const handler = vi.fn(async () => ({ body: {} }));
    await apiRoute<{ id: string }>({ write: true }, handler)(req("PATCH", '{"year":"2026"}'), { params: Promise.resolve({ id: "3" }) });
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ params: { id: "3" }, body: { year: "2026" }, caller: OK.caller }));
  });

  it("requires JSON for writes", async () => {
    const res = await apiRoute({ write: true }, async () => ({ body: {} }))(req("PATCH", "year=2026", { "content-type": "application/x-www-form-urlencoded" }));
    expect(res.status).toBe(415);
  });

  it("rejects invalid JSON and bodies over 1 MB", async () => {
    expect((await apiRoute({ write: true }, async () => ({ body: {} }))(req("PATCH", "{nope"))).status).toBe(400);
    const big = JSON.stringify({ x: "a".repeat(1024 * 1024) });
    expect((await apiRoute({ write: true }, async () => ({ body: {} }))(req("PATCH", big))).status).toBe(413);
  });

  it("logs successful writes with key, IP and summary", async () => {
    await apiRoute({ write: true }, async () => ({ body: {}, audit: "Endret prosjekt 3: no.title" }))(req("PATCH", "{}"));
    expect(audit).toEqual([expect.objectContaining({ keyId: 7, keyName: "Laptop", ip: "1.2.3.4", method: "PATCH", path: "/api/v1/projects/3", summary: "Endret prosjekt 3: no.title", status: 200 })]);
  });

  it("maps ApiError and zod errors to 4xx, and logs failed writes", async () => {
    const notFound = await apiRoute({ write: true }, async () => { throw new ApiError(404, "Fant ikke"); })(req("PATCH", "{}"));
    expect(notFound.status).toBe(404);
    const zod = await apiRoute({ write: true }, async () => ({ body: z.object({ a: z.string() }).parse({}) }))(req("PATCH", "{}"));
    expect(zod.status).toBe(400);
    expect((await zod.json()).error).toMatch(/^a:/);
    expect(audit.map((a) => a.status)).toEqual([404, 400]);
  });

  it("hides internal errors behind a 500", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await apiRoute({ write: false }, async () => { throw new Error("db password in message"); })(req("GET"));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("password");
    spy.mockRestore();
  });
});

// Static checks over the route files, like admin-guard.test.ts does for actions
describe("/api/v1 routes", () => {
  const root = path.resolve(__dirname, "../src/app/api/v1");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = path.join(dir, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (f === "route.ts") files.push(p);
    }
  };
  walk(root);

  it("finds the routes", () => expect(files.length).toBeGreaterThanOrEqual(4));

  for (const file of files) {
    const rel = path.relative(root, file);
    const src = readFileSync(file, "utf8");
    it(`${rel}: every exported method goes through apiRoute`, () => {
      const methods = [...src.matchAll(/export (?:const|async function) (GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1]);
      expect(methods.length).toBeGreaterThan(0);
      for (const m of methods) expect(src).toMatch(new RegExp(`export const ${m} = apiRoute`));
    });
    it(`${rel}: has no DELETE`, () => expect(src).not.toMatch(/export (const|async function) DELETE/));
  }
});
