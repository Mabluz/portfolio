import { BlockList, isIP } from "node:net";

/** "::ffff:1.2.3.4" (IPv4 seen through an IPv6 socket) -> "1.2.3.4". */
export function normalizeIp(ip: string): string {
  const v = ip.trim().toLowerCase();
  const mapped = v.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  return mapped ? mapped[1] : v;
}

/**
 * Parses an IP whitelist: one IP or CIDR per entry (lines, commas or spaces). Returns the
 * normalized entries, or the first invalid one. Empty input is a valid, empty list.
 */
export function parseIpList(input: string | string[]): { ok: true; ips: string[] } | { ok: false; error: string } {
  const parts = (Array.isArray(input) ? input : input.split(/[\s,]+/)).map((p) => p.trim()).filter(Boolean);
  const ips: string[] = [];
  for (const part of parts) {
    const [addr, bits, extra] = part.split("/");
    const ip = normalizeIp(addr);
    const family = isIP(ip);
    if (!family || extra !== undefined) return { ok: false, error: `Ugyldig IP-adresse: ${part}` };
    if (bits !== undefined) {
      const n = Number(bits);
      const max = family === 4 ? 32 : 128;
      if (!/^\d{1,3}$/.test(bits) || n > max) return { ok: false, error: `Ugyldig nettverksmaske: ${part}` };
      ips.push(`${ip}/${n}`);
    } else {
      ips.push(ip);
    }
  }
  return { ok: true, ips: [...new Set(ips)] };
}

/** True if `ip` matches one of the entries. An empty list allows every IP. */
export function ipAllowed(ip: string, allowed: string[]): boolean {
  if (allowed.length === 0) return true;
  const addr = normalizeIp(ip);
  const family = isIP(addr);
  if (!family) return false;
  const list = new BlockList();
  for (const entry of allowed) {
    const [a, bits] = entry.split("/");
    const type = isIP(a) === 6 ? "ipv6" : "ipv4";
    if (bits !== undefined) list.addSubnet(a, Number(bits), type);
    else list.addAddress(a, type);
  }
  return list.check(addr, family === 6 ? "ipv6" : "ipv4");
}
