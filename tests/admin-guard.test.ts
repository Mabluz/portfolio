import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Every Server Action is a public POST endpoint, so each admin action must reject a visitor
// without a session before touching the database. This test finds all exported actions itself,
// so a new action that forgets requireAdmin() fails here.

const PUBLIC_ACTIONS = new Set(["auth.login", "auth.logout", "lang.setLang"]);

class RedirectError extends Error {}

const dbCalls: string[] = [];

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectError(to);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/db", () => {
  // Records any access, e.g. db.project.update, so the test can assert nothing was touched.
  const model = (name: string): unknown =>
    new Proxy(() => {}, {
      get: (_t, prop) => (typeof prop === "string" ? model(`${name}.${prop}`) : undefined),
      apply: () => {
        dbCalls.push(name);
        return Promise.resolve(null);
      },
    });
  return { db: model("db") };
});

const actionsDir = path.resolve(__dirname, "../src/server/actions");
const actionFiles = readdirSync(actionsDir).filter((f) => f.endsWith(".ts"));

beforeEach(() => {
  dbCalls.length = 0;
});

describe("admin Server Actions", () => {
  it("finds the action modules", () => expect(actionFiles).toEqual(expect.arrayContaining(["projects.ts", "about.ts", "auth.ts", "lang.ts"])));

  it("the db mock records calls, so the assertion below can fail", async () => {
    const { db } = (await import("@/lib/db")) as unknown as { db: { project: { update: () => Promise<unknown> } } };
    await db.project.update();
    expect(dbCalls).toEqual(["db.project.update"]);
  });

  for (const file of actionFiles) {
    const mod = file.replace(/\.ts$/, "");
    it(`${file}: every admin action redirects to login without a session`, async () => {
      const exports = (await import(`../src/server/actions/${mod}.ts`)) as Record<string, unknown>;
      const actions = Object.entries(exports).filter(([name, fn]) => typeof fn === "function" && !PUBLIC_ACTIONS.has(`${mod}.${name}`));
      if (mod === "projects") expect(actions.map(([n]) => n)).toEqual(expect.arrayContaining(["saveProject", "deleteProject", "uploadProjectImages"]));
      if (mod === "about") expect(actions.map(([n]) => n)).toEqual(expect.arrayContaining(["saveAbout", "uploadCv", "removeCv"]));
      for (const [name, fn] of actions) {
        const call = (fn as (...args: unknown[]) => Promise<unknown>)(1, new FormData());
        await expect(call, name).rejects.toThrow(RedirectError);
        await call.catch((e: Error) => expect(e.message, name).toBe("/admin/login"));
        expect(dbCalls, `${name} touched the database before the auth check`).toEqual([]);
      }
    });
  }
});

describe("protected admin pages", () => {
  const root = path.resolve(__dirname, "../src/app/admin/(protected)");
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const full = path.join(dir, f);
      return statSync(full).isDirectory() ? walk(full) : /^(page|layout)\.tsx$/.test(f) ? [full] : [];
    });

  const files = walk(root);
  it("finds the layout and pages", () => expect(files.length).toBeGreaterThanOrEqual(4));

  // The layout alone is not enough: pages render in parallel with it, so each page checks too.
  for (const file of files) {
    it(`${path.relative(root, file)} calls requireAdmin()`, () => {
      expect(readFileSync(file, "utf8")).toMatch(/await requireAdmin\(\)/);
    });
  }
});
