"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createApiKey, revokeApiKey, updateApiKeyIps } from "@/server/actions/apiKeys";

type Key = { id: number; name: string; prefix: string; allowedIps: string[]; createdAt: string; lastUsedAt: string | null; lastUsedIp: string | null; revoked: boolean };
type Log = { id: number; keyName: string; ip: string; method: string; path: string; summary: string; status: number; at: string };

const card = "rounded-2xl border border-admin-line bg-paper p-6";
const input = "box-border min-h-11 w-full rounded-[10px] border border-line bg-white px-3.5 py-[11px] text-[15px] text-ink focus:border-forest focus:outline-2 focus:outline-offset-1 focus:outline-forest";
const btn = "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] px-[18px] text-sm font-semibold no-underline disabled:opacity-60";
const btnGhost = `${btn} border border-line bg-paper text-ink hover:border-ink`;
const btnPrimary = `${btn} border-0 bg-forest text-sand hover:bg-forest-dark`;
const btnDanger = `${btn} border border-[#c9a0a0] bg-transparent text-[#8e2f2f] hover:bg-[#f6e7e4]`;

const fmt = (iso: string) => new Date(iso).toLocaleString("nb-NO", { dateStyle: "short", timeStyle: "short" });

export function ApiKeys({ baseUrl, myIp, initialKeys, logs }: { baseUrl: string; myIp: string | null; initialKeys: Key[]; logs: Log[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ips, setIps] = useState("");
  const [newKey, setNewKey] = useState<{ name: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<{ id: number; value: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<number | null>(null);

  function create() {
    start(async () => {
      const res = await createApiKey(name, ips);
      if (!res.ok) { setMsg({ kind: "error", text: res.error }); return; }
      setNewKey({ name: name.trim(), key: res.key });
      setCopied(false);
      setName(""); setIps(""); setMsg(null);
      router.refresh();
    });
  }

  function saveIps(id: number, value: string) {
    start(async () => {
      const res = await updateApiKeyIps(id, value);
      if (!res.ok) { setMsg({ kind: "error", text: res.error }); return; }
      setEditing(null);
      setMsg({ kind: "ok", text: res.ips.length ? "IP-listen er lagret" : "IP-listen er tom: nøkkelen virker fra alle IP-er" });
      router.refresh();
    });
  }

  function revoke(id: number) {
    start(async () => {
      const res = await revokeApiKey(id);
      setConfirmRevoke(null);
      if (!res.ok) { setMsg({ kind: "error", text: res.error }); return; }
      setMsg({ kind: "ok", text: "Nøkkelen er trukket tilbake" });
      router.refresh();
    });
  }

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setMsg({ kind: "error", text: "Fikk ikke kopiert til utklippstavlen" }); }
  }

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-8">
        <p className="m-0 mb-1.5 font-mono text-[13px] text-forest">API</p>
        <h1 className="font-serif m-0 text-[40px] font-medium">API-nøkler</h1>
        <p className="mt-2 mb-0 max-w-[680px] text-[15px] text-muted-2">Nøklene gir lese- og skrivetilgang til prosjekter, «Om meg» og teknologier via <code className="font-mono text-[13px]">{baseUrl}/api/v1</code>. Sletting og filopplasting går ikke via API-et.</p>
      </div>
      {msg && <p role={msg.kind === "error" ? "alert" : "status"} className={`mb-4 rounded-[10px] px-4 py-3 text-sm ${msg.kind === "error" ? "bg-[#f6e7e4] text-[#8e2f2f]" : "bg-[#dcebe2] text-forest"}`}>{msg.text}</p>}

      <div className="flex flex-col gap-6">
        {newKey && (
          <section className={`${card} !border-forest`} aria-live="polite">
            <h2 className="m-0 mb-1 text-[17px] font-semibold">Ny nøkkel: {newKey.name}</h2>
            <p className="mt-0 mb-4 text-sm font-semibold text-[#8e2f2f]">Kopier nøkkelen nå. Den vises bare denne ene gangen.</p>
            <div className="flex flex-wrap gap-2.5">
              <code className="min-w-0 flex-1 rounded-[10px] bg-[#efe8da] px-3.5 py-3 font-mono text-[13px] break-all">{newKey.key}</code>
              <button type="button" className={btnPrimary} onClick={() => copy(newKey.key)}>{copied ? "Kopiert" : "Kopier"}</button>
            </div>
            <button type="button" className="mt-3 cursor-pointer border-0 bg-transparent p-0 text-sm text-muted-2 underline" onClick={() => setNewKey(null)}>Jeg har lagret den, skjul</button>
          </section>
        )}

        <section className={card}>
          <h2 className="m-0 mb-1 text-[17px] font-semibold">Ny nøkkel</h2>
          <p className="mt-0 mb-5 text-sm text-muted-2">Gi den et navn som sier hvor den brukes, f.eks. «Claude på laptopen».</p>
          <div className="mb-[18px] flex flex-col gap-1.5">
            <label htmlFor="k-name" className="text-sm font-semibold">Navn</label>
            <input id="k-name" className={input} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Claude på laptopen" />
          </div>
          <div className="mb-[18px] flex flex-col gap-1.5">
            <label htmlFor="k-ips" className="text-sm font-semibold">Tillatte IP-adresser</label>
            <textarea id="k-ips" rows={3} className={`${input} font-mono !text-[13px]`} value={ips} onChange={(e) => setIps(e.target.value)} placeholder={"84.12.34.56\n2001:db8::/32"} />
            <span className="text-[13px] text-muted-2">Én IP eller IP-range (CIDR) per linje. Tom liste betyr at nøkkelen virker fra alle IP-er.{myIp && <> Din IP nå: <code className="font-mono">{myIp}</code>.</>}</span>
            {myIp && <div><button type="button" className={`${btnGhost} mt-1`} onClick={() => setIps((v) => (v.split(/\s+/).includes(myIp) ? v : `${v.trim()}${v.trim() ? "\n" : ""}${myIp}`))}>Bruk min nåværende IP</button></div>}
          </div>
          <button type="button" className={btnPrimary} disabled={pending || !name.trim()} onClick={create}>{pending ? "Oppretter…" : "Opprett nøkkel"}</button>
        </section>

        <section className={card}>
          <h2 className="m-0 mb-5 text-[17px] font-semibold">Nøkler</h2>
          {initialKeys.length === 0 ? <p className="m-0 text-sm text-muted-2">Ingen nøkler ennå.</p> : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {initialKeys.map((k) => (
                <li key={k.id} className={`rounded-xl border border-admin-line p-4 ${k.revoked ? "opacity-60" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="m-0 font-semibold">{k.name} <code className="ml-1.5 font-mono text-[12px] font-normal text-muted-2">{k.prefix}…</code></p>
                      <p className="m-0 mt-1 text-[13px] text-muted-2">
                        Opprettet {fmt(k.createdAt)} · {k.lastUsedAt ? <>Sist brukt {fmt(k.lastUsedAt)} fra <code className="font-mono">{k.lastUsedIp}</code></> : "Aldri brukt"}
                      </p>
                    </div>
                    {k.revoked ? <span className="rounded-full bg-[#efe8da] px-2.5 py-1 text-[13px] text-muted">Trukket tilbake</span>
                      : confirmRevoke !== k.id && <button type="button" className={btnDanger} disabled={pending} onClick={() => setConfirmRevoke(k.id)}>Trekk tilbake</button>}
                  </div>
                  {!k.revoked && (
                    <div className="mt-3">
                      {editing?.id === k.id ? (
                        <div className="flex flex-col gap-2">
                          <label htmlFor={`ips-${k.id}`} className="text-sm font-semibold">Tillatte IP-adresser</label>
                          <textarea id={`ips-${k.id}`} rows={3} className={`${input} font-mono !text-[13px]`} value={editing.value} onChange={(e) => setEditing({ id: k.id, value: e.target.value })} />
                          <div className="flex flex-wrap gap-2.5">
                            <button type="button" className={btnPrimary} disabled={pending} onClick={() => saveIps(k.id, editing.value)}>Lagre</button>
                            <button type="button" className={btnGhost} onClick={() => setEditing(null)}>Avbryt</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          {k.allowedIps.length === 0
                            ? <span className="rounded-full bg-[#f3e7d2] px-2.5 py-1 text-[13px] text-[#6e4a14]">Alle IP-er</span>
                            : k.allowedIps.map((ip) => <code key={ip} className="rounded-full border border-line px-2.5 py-1 font-mono text-[12px]">{ip}</code>)}
                          <button type="button" className="cursor-pointer border-0 bg-transparent p-1 text-sm text-forest underline" onClick={() => setEditing({ id: k.id, value: k.allowedIps.join("\n") })}>Endre IP-er</button>
                        </div>
                      )}
                    </div>
                  )}
                  {confirmRevoke === k.id && !k.revoked && (
                    <div role="alertdialog" aria-label={`Bekreft tilbaketrekking av ${k.name}`} className="mt-3 rounded-xl bg-[#f6e7e4] p-4">
                      <p className="mt-0 mb-3 text-sm font-semibold text-[#8e2f2f]">Trekke tilbake «{k.name}»? Alt som bruker nøkkelen, slutter å virke med en gang. Det kan ikke angres.</p>
                      <div className="flex flex-wrap gap-2.5">
                        <button type="button" disabled={pending} className={`${btn} border-0 bg-[#8e2f2f] text-white`} onClick={() => revoke(k.id)}>{pending ? "Trekker tilbake…" : "Ja, trekk tilbake"}</button>
                        <button type="button" className={btnGhost} onClick={() => setConfirmRevoke(null)}>Avbryt</button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={card}>
          <h2 className="m-0 mb-1 text-[17px] font-semibold">Logg</h2>
          <p className="mt-0 mb-5 text-sm text-muted-2">De siste 50 kallene som endret, eller prøvde å endre, data.</p>
          {logs.length === 0 ? <p className="m-0 text-sm text-muted-2">Ingen endringer via API-et ennå.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
                <thead><tr className="border-b border-admin-line text-muted-2"><th className="py-2 pr-3 font-semibold">Tid</th><th className="py-2 pr-3 font-semibold">Nøkkel</th><th className="py-2 pr-3 font-semibold">IP</th><th className="py-2 pr-3 font-semibold">Kall</th><th className="py-2 font-semibold">Hva</th></tr></thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b border-admin-line align-top last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">{fmt(l.at)}</td>
                      <td className="py-2 pr-3">{l.keyName}</td>
                      <td className="py-2 pr-3 font-mono">{l.ip}</td>
                      <td className="py-2 pr-3 font-mono whitespace-nowrap">{l.method} {l.path} <span className={l.status < 300 ? "text-forest" : "text-[#8e2f2f]"}>{l.status}</span></td>
                      <td className="py-2">{l.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={card}>
          <h2 className="m-0 mb-1 text-[17px] font-semibold">Bruk med Claude (MCP)</h2>
          <p className="mt-0 mb-3 text-sm text-muted-2">Repoet har en MCP-server i <code className="font-mono">mcp/</code>, registrert i <code className="font-mono">.mcp.json</code>. Sett disse i shellet før du starter Claude Code i repoet:</p>
          <pre className="m-0 overflow-x-auto rounded-[10px] bg-[#efe8da] px-3.5 py-3 font-mono text-[13px]">{`export PORTFOLIO_API_URL="${baseUrl}"\nexport PORTFOLIO_API_KEY="pf_..."`}</pre>
        </section>
      </div>
    </div>
  );
}
