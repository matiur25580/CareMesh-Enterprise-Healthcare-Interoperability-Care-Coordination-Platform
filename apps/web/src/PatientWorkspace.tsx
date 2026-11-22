import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, ArrowLeft, CalendarDays, Check, ChevronRight, ClipboardList, FilePlus2, Filter, HeartPulse, LogIn, Plus, Search, ShieldCheck, UserRound, Users, X } from "lucide-react";
import "./patient-workspace.css";

const API_BASE = (import.meta as ImportMeta & { env: { VITE_API_BASE_URL?: string } }).env.VITE_API_BASE_URL ?? "http://localhost:4000";

type Patient = {
  _id: string;
  medicalRecordNumber: string;
  name: { given: string[]; family: string };
  birthDate: string;
  administrativeGender: "female" | "male" | "other" | "unknown";
  status: "active" | "inactive" | "merged";
  telecom?: { email?: string; phone?: string };
  address?: { city?: string; region?: string; country?: string };
  createdAt?: string;
};
type ClinicalRecord = {
  _id: string;
  resourceType: string;
  code: { display: string; system?: string; value?: string };
  status: string;
  effectiveAt: string;
  note?: string;
};
type ApiError = { error?: { message?: string; code?: string } };

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const send = (accessToken: string) => fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...init.headers }
  });
  let response = await send(sessionStorage.getItem("caremesh_access_token") ?? token);
  if (response.status === 401 && path !== "/api/v1/auth/refresh") {
    const refresh = await fetch(`${API_BASE}/api/v1/auth/refresh`, { method: "POST", credentials: "include" });
    const refreshed = await refresh.json().catch(() => ({})) as { data?: { accessToken?: string } };
    if (refresh.ok && refreshed.data?.accessToken) {
      sessionStorage.setItem("caremesh_access_token", refreshed.data.accessToken);
      response = await send(refreshed.data.accessToken);
    }
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as ApiError;
    throw new Error(payload.error?.message ?? `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function displayName(patient: Patient): string {
  return [...patient.name.given, patient.name.family].join(" ");
}
function ageFrom(date: string): string {
  const birth = new Date(date);
  if (Number.isNaN(birth.getTime())) return "—";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? `${age} years` : "—";
}
function dateLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default function PatientWorkspace() {
  const [token, setToken] = useState(() => sessionStorage.getItem("caremesh_access_token") ?? "");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showRecord, setShowRecord] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ medicalRecordNumber: "", given: "", family: "", birthDate: "", administrativeGender: "unknown", email: "", phone: "" });
  const [recordForm, setRecordForm] = useState({ resourceType: "condition", display: "", status: "active", effectiveAt: new Date().toISOString().slice(0, 10), note: "" });

  const loadPatients = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (status !== "all") params.set("status", status);
      params.set("limit", "50");
      params.set("purpose", "treatment");
      const result = await request<{ data: Patient[] }>(`/api/v1/patients?${params.toString()}`, token);
      setPatients(result.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load patient records.");
    } finally { setLoading(false); }
  }, [token, query, status]);

  useEffect(() => { void loadPatients(); }, [loadPatients]);

  useEffect(() => {
    if (!token || !selected) { setRecords([]); return; }
    let cancelled = false;
    request<{ data: ClinicalRecord[] }>(`/api/v1/patients/${selected._id}/records?purpose=treatment`, token)
      .then(result => { if (!cancelled) setRecords(result.data); })
      .catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Unable to load clinical history."); });
    return () => { cancelled = true; };
  }, [token, selected]);

  const counts = useMemo(() => ({
    total: patients.length,
    active: patients.filter(patient => patient.status === "active").length,
    inactive: patients.filter(patient => patient.status !== "active").length
  }), [patients]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true); setError("");
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const result = await response.json() as { data?: { accessToken?: string }; error?: { message?: string } };
      if (!response.ok || !result.data?.accessToken) throw new Error(result.error?.message ?? "Sign-in failed.");
      sessionStorage.setItem("caremesh_access_token", result.data.accessToken);
      setToken(result.data.accessToken);
      setLoginPassword("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to sign in."); }
    finally { setSubmitting(false); }
  }

  function signOut() {
    const current = token;
    void request<void>("/api/v1/auth/logout", current, { method: "POST" }).catch(() => undefined);
    sessionStorage.removeItem("caremesh_access_token");
    setToken(""); setPatients([]); setSelected(null); setRecords([]);
  }

  async function createPatient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setError(""); setNotice("");
    try {
      await request("/api/v1/patients", token, {
        method: "POST",
        body: JSON.stringify({
          medicalRecordNumber: form.medicalRecordNumber,
          name: { given: form.given.split(" ").filter(Boolean), family: form.family },
          birthDate: form.birthDate,
          administrativeGender: form.administrativeGender,
          telecom: { ...(form.email ? { email: form.email } : {}), ...(form.phone ? { phone: form.phone } : {}) }
        })
      });
      setShowCreate(false);
      setForm({ medicalRecordNumber: "", given: "", family: "", birthDate: "", administrativeGender: "unknown", email: "", phone: "" });
      setNotice("Patient registered successfully.");
      await loadPatients();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to register patient."); }
    finally { setSubmitting(false); }
  }

  async function createRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSubmitting(true); setError(""); setNotice("");
    try {
      await request(`/api/v1/patients/${selected._id}/records`, token, {
        method: "POST",
        body: JSON.stringify({
          purpose: "treatment",
          resourceType: recordForm.resourceType,
          code: { display: recordForm.display },
          status: recordForm.status,
          effectiveAt: recordForm.effectiveAt,
          ...(recordForm.note ? { note: recordForm.note } : {})
        })
      });
      setShowRecord(false);
      setRecordForm({ resourceType: "condition", display: "", status: "active", effectiveAt: new Date().toISOString().slice(0, 10), note: "" });
      const result = await request<{ data: ClinicalRecord[] }>(`/api/v1/patients/${selected._id}/records?purpose=treatment`, token);
      setRecords(result.data);
      setNotice("Clinical record added.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to add clinical record."); }
    finally { setSubmitting(false); }
  }

  if (!token) return <section className="patient-area">
    <div className="patient-login">
      <div className="pw-brand"><div><HeartPulse size={22}/></div><span>CareMesh secure access</span></div>
      <h1>Patient records</h1>
      <p>Sign in with your CareMesh organization account to access its patient registry.</p>
      {error && <div className="pw-alert"><AlertCircle size={16}/>{error}</div>}
      <form onSubmit={signIn}>
        <label>Email address<input type="email" autoComplete="username" required value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="you@organization.com"/></label>
        <label>Password<input type="password" autoComplete="current-password" required value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="Your account password"/></label>
        <button className="pw-primary" disabled={submitting}><LogIn size={16}/>{submitting ? "Signing in…" : "Sign in securely"}</button>
      </form>
      <small>Access is authenticated by the CareMesh API. Patient data is not stored in this browser beyond the active session token.</small>
    </div>
  </section>;

  return <section className="patient-area">
    <div className="pw-heading">
      <div><div className="pw-eyebrow"><Users size={13}/> CARE DELIVERY</div><h1>Patient records</h1><p>Manage patient identities and review longitudinal clinical context.</p></div>
      <div className="pw-heading-actions"><button className="pw-secondary" onClick={signOut}>Sign out</button><button className="pw-primary" onClick={()=>{setError("");setShowCreate(true);}}><Plus size={16}/> Register patient</button></div>
    </div>
    {error && <div className="pw-alert"><AlertCircle size={16}/>{error}<button onClick={()=>setError("")} aria-label="Dismiss"><X size={14}/></button></div>}
    {notice && <div className="pw-notice"><Check size={15}/>{notice}<button onClick={()=>setNotice("")} aria-label="Dismiss"><X size={14}/></button></div>}
    {selected ? <div className="pw-detail">
      <button className="pw-back" onClick={()=>setSelected(null)}><ArrowLeft size={15}/> Back to patient registry</button>
      <div className="pw-patient-hero">
        <div className="pw-person-icon"><UserRound size={25}/></div>
        <div className="pw-person-title"><h2>{displayName(selected)}</h2><span>{selected.medicalRecordNumber} · {selected.status}</span></div>
        <button className="pw-primary" onClick={()=>setShowRecord(true)}><FilePlus2 size={15}/> Add clinical record</button>
      </div>
      <div className="pw-facts">
        <div><small>DATE OF BIRTH</small><b>{dateLabel(selected.birthDate)}</b></div>
        <div><small>AGE</small><b>{ageFrom(selected.birthDate)}</b></div>
        <div><small>ADMINISTRATIVE GENDER</small><b>{selected.administrativeGender}</b></div>
        <div><small>CONTACT</small><b>{selected.telecom?.email ?? selected.telecom?.phone ?? "Not provided"}</b></div>
      </div>
      <div className="pw-section-head"><div><h3>Clinical history</h3><p>Records associated with this patient in the active organization</p></div><span>{records.length} records</span></div>
      <div className="pw-record-list">
        {records.length ? records.map(record=><article className="pw-record" key={record._id}><div className="pw-record-icon"><Activity size={17}/></div><div className="pw-record-content"><b>{record.code.display}</b><span>{record.resourceType.replaceAll("_"," ")} · {record.status}</span>{record.note && <p>{record.note}</p>}</div><time>{dateLabel(record.effectiveAt)}</time></article>) : <div className="pw-empty"><ClipboardList size={25}/><b>No clinical records yet</b><span>When authorized clinical information is added, it will appear here.</span></div>}
      </div>
    </div> : <>
      <div className="pw-stats">
        <article><span><Users size={16}/></span><small>Patients in current results</small><b>{counts.total}</b></article>
        <article><span className="teal"><ShieldCheck size={16}/></span><small>Active records</small><b>{counts.active}</b></article>
        <article><span className="gold"><ClipboardList size={16}/></span><small>Inactive / merged</small><b>{counts.inactive}</b></article>
      </div>
      <div className="pw-registry">
        <div className="pw-registry-head"><div><h2>Patient registry</h2><p>Search by name, medical record number, or email.</p></div><span><ShieldCheck size={14}/> Organization-scoped access</span></div>
        <div className="pw-filters">
          <label className="pw-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search patients…"/>{query && <button onClick={()=>setQuery("")} aria-label="Clear search"><X size={14}/></button>}</label>
          <label className="pw-select"><Filter size={14}/><select value={status} onChange={e=>setStatus(e.target.value)}><option value="active">Active patients</option><option value="inactive">Inactive</option><option value="merged">Merged</option><option value="all">All statuses</option></select></label>
        </div>
        <div className="pw-table-wrap"><table className="pw-table"><thead><tr><th>PATIENT</th><th>MEDICAL RECORD NO.</th><th>DATE OF BIRTH</th><th>CONTACT</th><th>STATUS</th><th></th></tr></thead><tbody>
          {patients.map(patient=><tr key={patient._id} onClick={()=>setSelected(patient)}><td><div className="pw-table-person"><i>{patient.name.given[0]?.[0] ?? ""}{patient.name.family[0] ?? ""}</i><b>{displayName(patient)}</b></div></td><td>{patient.medicalRecordNumber}</td><td>{dateLabel(patient.birthDate)}</td><td>{patient.telecom?.email ?? patient.telecom?.phone ?? "—"}</td><td><span className={`pw-state ${patient.status}`}>{patient.status}</span></td><td><ChevronRight size={16}/></td></tr>)}
        </tbody></table>
        {loading && <div className="pw-loading">Loading patient registry…</div>}
        {!loading && patients.length===0 && <div className="pw-empty"><Users size={25}/><b>No patients found</b><span>{query ? "Try a different search or clear the filters." : "Register a patient to begin building your organization’s registry."}</span></div>}
        </div>
        <div className="pw-table-foot">Showing {patients.length} patient{patients.length===1?"":"s"} · Maximum 50 per request</div>
      </div>
    </>}
    {showCreate && <div className="pw-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setShowCreate(false);}}><section className="pw-modal" role="dialog" aria-modal="true" aria-labelledby="pw-create-title"><div className="pw-modal-head"><div><h2 id="pw-create-title">Register a patient</h2><p>Create a patient identity in your active organization.</p></div><button onClick={()=>setShowCreate(false)} aria-label="Close"><X size={18}/></button></div><form onSubmit={createPatient} className="pw-form"><div className="pw-form-grid"><label>Medical record number<input required maxLength={64} value={form.medicalRecordNumber} onChange={e=>setForm({...form,medicalRecordNumber:e.target.value})} placeholder="MRN-000123"/></label><label>Date of birth<input type="date" required value={form.birthDate} onChange={e=>setForm({...form,birthDate:e.target.value})}/></label><label>Given name(s)<input required value={form.given} onChange={e=>setForm({...form,given:e.target.value})} placeholder="First and middle names"/></label><label>Family name<input required value={form.family} onChange={e=>setForm({...form,family:e.target.value})} placeholder="Family name"/></label><label>Administrative gender<select value={form.administrativeGender} onChange={e=>setForm({...form,administrativeGender:e.target.value})}><option value="unknown">Unknown</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></label><label>Email address<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Optional"/></label><label>Phone number<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Optional"/></label></div><div className="pw-privacy"><ShieldCheck size={15}/> Patient identity is scoped to the active organization. Use synthetic data in development and demos.</div><div className="pw-modal-actions"><button type="button" className="pw-secondary" onClick={()=>setShowCreate(false)}>Cancel</button><button className="pw-primary" disabled={submitting}>{submitting?"Saving…":"Register patient"}</button></div></form></section></div>}
    {showRecord && selected && <div className="pw-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setShowRecord(false);}}><section className="pw-modal" role="dialog" aria-modal="true" aria-labelledby="pw-record-title"><div className="pw-modal-head"><div><h2 id="pw-record-title">Add clinical record</h2><p>For {displayName(selected)} · {selected.medicalRecordNumber}</p></div><button onClick={()=>setShowRecord(false)} aria-label="Close"><X size={18}/></button></div><form onSubmit={createRecord} className="pw-form"><div className="pw-form-grid"><label>Resource type<select value={recordForm.resourceType} onChange={e=>setRecordForm({...recordForm,resourceType:e.target.value})}><option value="condition">Condition</option><option value="allergy_intolerance">Allergy / intolerance</option><option value="medication_statement">Medication statement</option><option value="observation">Observation</option><option value="procedure">Procedure</option><option value="encounter">Encounter</option><option value="clinical_note">Clinical note</option></select></label><label>Effective date<input type="date" required value={recordForm.effectiveAt} onChange={e=>setRecordForm({...recordForm,effectiveAt:e.target.value})}/></label><label className="pw-full">Clinical concept / display<input required maxLength={240} value={recordForm.display} onChange={e=>setRecordForm({...recordForm,display:e.target.value})} placeholder="Enter a descriptive clinical concept"/></label><label>Status<select value={recordForm.status} onChange={e=>setRecordForm({...recordForm,status:e.target.value})}><option value="active">Active</option><option value="inactive">Inactive</option><option value="resolved">Resolved</option><option value="entered_in_error">Entered in error</option></select></label><label className="pw-full">Note (optional)<textarea maxLength={4000} rows={3} value={recordForm.note} onChange={e=>setRecordForm({...recordForm,note:e.target.value})} placeholder="Additional context"/></label></div><div className="pw-privacy"><ShieldCheck size={15}/> Only authorized clinical roles can create records. This is a basic record foundation, not a clinical decision tool.</div><div className="pw-modal-actions"><button type="button" className="pw-secondary" onClick={()=>setShowRecord(false)}>Cancel</button><button className="pw-primary" disabled={submitting}>{submitting?"Saving…":"Add record"}</button></div></form></section></div>}
    <div className="pw-disclaimer"><CalendarDays size={13}/> CareMesh patient workspace · Use synthetic data only · Not intended for clinical decision-making</div>
  </section>;
}
