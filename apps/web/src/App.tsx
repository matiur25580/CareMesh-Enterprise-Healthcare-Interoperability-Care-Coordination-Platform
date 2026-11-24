import { FormEvent, useEffect, useState } from "react";

type User = { id: string; tenantId: string; email: string; role: string };
type Health = { status: string; database: string; service: string };
type Decision = { decision: "allow" | "deny"; reasons: string[]; evaluatedAt?: string };
type AuditItem = { _id: string; requestedPurpose: string; consentStatus: string; decision: "allow" | "deny"; reasons: string[]; evaluatedAt: string; actorUserId: string };
const API = import.meta.env.VITE_API_BASE_URL ?? "";
async function api<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
  return body as T;
}
const purposeOptions = ["treatment", "care-coordination", "payment", "operations"];

export default function App() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [tenantId, setTenantId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Decision | null>(null);
  const [history, setHistory] = useState<AuditItem[]>([]);
  const [form, setForm] = useState({ consentStatus: "active", requestedPurpose: "care-coordination", permittedPurposes: "treatment, care-coordination", validFrom: new Date(Date.now()-3600000).toISOString(), validUntil: new Date(Date.now()+86400000).toISOString() });

  useEffect(() => { api<Health>("/api/health").then(setHealth).catch(() => setHealth(null)); }, []);

  async function refreshHistory(accessToken: string) {
    try {
      const data = await api<{ items: AuditItem[] }>("/api/consent/history?limit=25", accessToken);
      setHistory(data.items);
    } catch { setNotice("Decision completed, but history could not be refreshed."); }
  }

  async function signIn(event: FormEvent) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const data = await api<{ accessToken: string; user: User }>("/api/auth/login", undefined, { method: "POST", body: JSON.stringify({ tenantId, email, password }) });
      setToken(data.accessToken); setUser(data.user); setPassword("");
      await refreshHistory(data.accessToken);
      setNotice("Signed in. Use synthetic consent snapshots only.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Sign-in failed"); }
    finally { setBusy(false); }
  }

  async function evaluate(event: FormEvent) {
    event.preventDefault(); if (!token) return;
    setBusy(true); setNotice(""); setResult(null);
    try {
      const data = await api<Decision>("/api/consent/evaluate", token, {
        method: "POST",
        body: JSON.stringify({
          consentStatus: form.consentStatus,
          requestedPurpose: form.requestedPurpose,
          permittedPurposes: form.permittedPurposes.split(",").map(value => value.trim()).filter(Boolean),
          validFrom: form.validFrom,
          validUntil: form.validUntil
        })
      });
      setResult(data);
      await refreshHistory(token);
      setNotice("Evaluation completed and recorded in tenant-scoped synthetic audit history. This is not an EHR access authorization.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Evaluation failed"); }
    finally { setBusy(false); }
  }

  function signOut() { setToken(""); setUser(null); setResult(null); setHistory([]); setNotice("Signed out."); }

  return <main className="layout">
    <aside className="rail"><div className="brand"><span className="mark">+</span><div><strong>CareMesh</strong><small>CONNECTED CARE SYSTEMS</small></div></div>
      <div className="nav-title">CARE OPERATIONS</div><div className="nav active">◉ <span>Consent workspace</span></div><div className="nav muted">⌘ <span>FHIR exchange</span><em>Planned</em></div><div className="nav muted">↗ <span>Referral network</span><em>Planned</em></div><div className="nav muted">◷ <span>Access audit</span><em>Planned</em></div>
      <div className="rail-bottom"><span className="pulse"></span> API {health?.status === "ok" ? "connected" : "checking"}<small>{health?.database ?? "unknown DB"}</small></div>
    </aside>
    <section className="main">
      <header className="header"><div><span className="kicker">ORGANIZATION / CONSENT</span><h1>Consent & purpose workspace</h1></div>
        {user ? <div className="profile"><span className="avatar">{user.email.slice(0,1).toUpperCase()}</span><div>{user.email}<small>{user.role}</small></div><button className="outline" onClick={signOut}>Sign out</button></div> : <span className="connection">● {health?.status === "ok" ? "API online" : "API unavailable"}</span>}
      </header>
      <div className="safety"><strong>DEVELOPMENT / SYNTHETIC DATA ONLY</strong><span>Do not enter patient names, identifiers, medical records or real health information. This demo is not for clinical use.</span></div>
      {!user ? <section className="signin"><div><span className="kicker">AUTHORIZED ACCESS</span><h2>Welcome to CareMesh</h2><p>Sign in with an account provisioned by your organization administrator. Access is tenant-scoped.</p><div className="privacy-note">Privacy-first by design <span>·</span> Role-restricted workspace <span>·</span> Synthetic fixtures</div></div>
        <form onSubmit={signIn} className="signin-form"><label>Organization / tenant ID<input required value={tenantId} onChange={e=>setTenantId(e.target.value)} placeholder="demo-organization" /></label><label>Work email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="user@organization.org" /></label><label>Password<input required type="password" value={password} onChange={e=>setPassword(e.target.value)} /></label><button className="primary" disabled={busy}>{busy ? "Authenticating…" : "Enter workspace"} <span>→</span></button></form>
      </section> : <>
        <section className="welcome"><div><span className="kicker">TENANT WORKSPACE</span><h2>Consent decision simulator</h2><p>Evaluate purpose and validity rules using a synthetic consent snapshot.</p></div><div className="tenant"><small>ACTIVE TENANT</small><strong>{user.tenantId}</strong></div></section>
        <div className="stats"><article><small>IDENTITY</small><strong>Verified</strong><span>Authenticated account</span></article><article><small>AUTHORIZATION</small><strong>Role scoped</strong><span>{user.role}</span></article><article><small>DATABASE</small><strong>{health?.database ?? "Unknown"}</strong><span>API health status</span></article></div>
        <section className="workspace"><article className="card"><div className="card-head"><div><span className="kicker">POLICY INPUT</span><h3>Consent snapshot</h3></div><span className="tag">Synthetic</span></div>
          <form className="consent-form" onSubmit={evaluate}>
            <label>Consent status<select value={form.consentStatus} onChange={e=>setForm({...form,consentStatus:e.target.value})}><option value="active">Active</option><option value="revoked">Revoked</option><option value="expired">Expired</option><option value="unknown">Unknown</option></select></label>
            <label>Requested purpose<select value={form.requestedPurpose} onChange={e=>setForm({...form,requestedPurpose:e.target.value})}>{purposeOptions.map(p=><option key={p} value={p}>{p}</option>)}</select></label>
            <label>Permitted purposes<input value={form.permittedPurposes} onChange={e=>setForm({...form,permittedPurposes:e.target.value})} placeholder="treatment, care-coordination" /></label>
            <div className="two"><label>Valid from<input type="datetime-local" value={form.validFrom.slice(0,16)} onChange={e=>setForm({...form,validFrom:new Date(e.target.value).toISOString()})} /></label><label>Valid until<input type="datetime-local" value={form.validUntil.slice(0,16)} onChange={e=>setForm({...form,validUntil:new Date(e.target.value).toISOString()})} /></label></div>
            <button className="primary" disabled={busy}>{busy ? "Evaluating…" : "Evaluate consent"} <span>→</span></button>
          </form>
        </article>
        <article className="card result-card"><div className="card-head"><div><span className="kicker">DECISION OUTPUT</span><h3>Evaluation result</h3></div><span className="tag">Rule-based</span></div>
          {result ? <div className="decision"><div className={result.decision === "allow" ? "decision-mark allow" : "decision-mark deny"}>{result.decision === "allow" ? "✓" : "×"}</div><div><span className="kicker">SIMULATED DECISION</span><h2 className={result.decision}>{result.decision.toUpperCase()}</h2></div><div className="reasons"><strong>Decision rationale</strong>{result.reasons.length ? result.reasons.map(reason=><span key={reason}>• {reason.replaceAll("-"," ")}</span>) : <span>• All supplied snapshot checks passed</span>}</div></div> : <div className="result-empty"><span>◎</span><strong>Awaiting evaluation</strong><p>Submit the synthetic snapshot to see the rule outcome and rationale.</p></div>}
          <div className="result-foot">A simulated allow result does not grant access to an external clinical system.</div>
        </article></section>
        <section className="card history-card">
          <div className="card-head"><div><span className="kicker">AUDIT TRAIL</span><h3>Recent synthetic decisions</h3></div><button className="outline" onClick={()=>refreshHistory(token)}>Refresh history ↻</button></div>
          {history.length ? <div className="history-list">{history.map(item=><div className="history-row" key={item._id}>
            <div><strong>{item.requestedPurpose}</strong><small>{new Date(item.evaluatedAt).toLocaleString()} · {item.consentStatus} · {item.actorUserId}</small></div>
            <span className={item.decision === "allow" ? "history-allow" : "history-deny"}>{item.decision.toUpperCase()}</span>
            <small className="history-reasons">{item.reasons.length ? item.reasons.join(", ") : "All supplied checks passed"}</small>
          </div>)}</div> : <div className="history-empty">No synthetic evaluations recorded for this organization yet.</div>}
          <p className="history-disclaimer">History stores decision, purpose, actor and reason codes only. It does not store patient identifiers or clinical data.</p>
        </section>
      </>}
      {notice && <div className="notice" role="status">{notice}</div>}
      <footer>CAREMESH · DEVELOPMENT FOUNDATION <span>No PHI · No clinical workflows · No compliance claims</span></footer>
    </section>
  </main>;
}