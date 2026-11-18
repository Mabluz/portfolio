import { describe, expect, it } from "vitest";
import { clearFailures, clientIp, isThrottled, recordFailure, reserveAttempt } from "@/lib/auth";

describe("login throttle", () => {
  it("blocks after 5 failures and resets after the window", () => {
    const key = "1.2.3.4";
    const t0 = 1_000_000;
    for (let i = 0; i < 4; i++) recordFailure(key, t0);
    expect(isThrottled(key, t0)).toBe(false);
    recordFailure(key, t0);
    expect(isThrottled(key, t0)).toBe(true);
    expect(isThrottled(key, t0 + 16 * 60 * 1000)).toBe(false);
  });
  it("clears on success", () => {
    const key = "5.6.7.8";
    for (let i = 0; i < 5; i++) recordFailure(key);
    clearFailures(key);
    expect(isThrottled(key)).toBe(false);
  });
});

describe("reserveAttempt", () => {
  it("counts before the password check, so parallel attempts can't all pass", () => {
    const key = "7.7.7.7";
    const t0 = 2_000_000;
    // Simulates 20 requests arriving before any of them has finished bcrypt
    const allowed = Array.from({ length: 20 }, () => reserveAttempt(key, t0)).filter(Boolean).length;
    expect(allowed).toBe(5);
    expect(isThrottled(key, t0)).toBe(true);
  });
});

describe("clientIp", () => {
  const h = (init: Record<string, string>) => new Headers(init);
  it("prefers X-Real-IP", () => {
    expect(clientIp(h({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1, 9.9.9.9" }))).toBe("9.9.9.9");
  });
  it("uses the last X-Forwarded-For entry, not the client-supplied first one", () => {
    expect(clientIp(h({ "x-forwarded-for": "6.6.6.6, 9.9.9.9" }))).toBe("9.9.9.9");
  });
  it("falls back to unknown", () => {
    expect(clientIp(h({}))).toBe("unknown");
  });
});

describe("throttle pruning", () => {
  it("drops expired entries once the map is large", () => {
    const t0 = 5_000_000;
    for (let i = 0; i < 1000; i++) recordFailure(`old-${i}`, t0);
    for (let i = 0; i < 5; i++) recordFailure("fresh", t0 + 16 * 60 * 1000);
    expect(isThrottled("fresh", t0 + 16 * 60 * 1000)).toBe(true);
    expect(isThrottled("old-1", t0)).toBe(false);
  });
});
