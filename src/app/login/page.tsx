"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
export default function DemoLogin() {
  const [role, setRole] = useState<"issuer" | "admin">("issuer");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await fetch("/api/auth/demo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role, token }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error || "Sign-in failed.");
      setToken(""); router.push(role === "admin" ? "/admin/dashboard" : "/dashboard");
    } catch (e) { setError(e instanceof Error ? e.message : "Sign-in failed."); }
    finally { setBusy(false); }
  }
  return <main><header className="top"><Link className="brand" href="/">◈ ChainProof</Link><nav><Link href="/verify">Verify</Link><Link href="/system">System</Link></nav></header><section className="page"><div className="pagehead"><div className="eyebrow">LOCAL DEMO ACCESS</div><h1>Sign in to ChainProof</h1><p className="muted">Use the role-specific token configured in your private `.env` file. The server issues an HttpOnly session cookie that expires after eight hours.</p></div><form className="form panel" onSubmit={submit}><label>Demo role<select value={role} onChange={e=>setRole(e.target.value as "issuer"|"admin")}><option value="issuer">Issuer</option><option value="admin">Administrator</option></select></label><label>Local demo token<input type="password" autoComplete="current-password" value={token} onChange={e=>setToken(e.target.value)} required/></label><button className="button primary" disabled={busy}>{busy?"Signing in…":"Sign in"}</button><p className="small">This local development sign-in is not a production identity system. Keep the token private and do not expose the dev server to an untrusted network.</p></form>{error&&<div className="status error">{error}</div>}</section></main>;
}
