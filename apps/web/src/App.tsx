import { useState } from "react";
import PatientWorkspace from "./PatientWorkspace";
import { Activity, ArrowUpRight, Bell, Building2, CalendarDays, ChevronDown, FileHeart, FlaskConical, HeartPulse, LayoutDashboard, Search, ShieldCheck, Users } from "lucide-react";

const nav = [
  ["Overview", LayoutDashboard], ["Patient records", FileHeart], ["Care coordination", Users],
  ["Interoperability", Activity], ["Diagnostics", FlaskConical], ["Organizations", Building2], ["Consent & access", ShieldCheck]
] as const;
const metrics = [
  { label: "Connected organizations", value: "24", delta: "+3 this month", icon: Building2, tone: "blue" },
  { label: "Exchange events today", value: "1,284", delta: "+12.8% vs. last week", icon: Activity, tone: "violet" },
  { label: "Open care referrals", value: "86", delta: "18 need attention", icon: Users, tone: "amber" },
  { label: "Diagnostic results", value: "342", delta: "96.4% within SLA", icon: FlaskConical, tone: "green" }
];
const events = [
  ["NC", "Northstar Care Network", "FHIR Bundle received · Patient summary", "2 min ago", "Processed", "green"],
  ["ML", "Metro Labs", "Diagnostic result delivered · Observation", "8 min ago", "Processed", "green"],
  ["HP", "HarborPoint Health", "Referral acknowledgement pending", "14 min ago", "Awaiting", "amber"],
  ["AP", "Aster Pharmacy Group", "Medication statement sync · 3 records", "21 min ago", "Review", "blue"]
];

export default function App() {
  const [activeView, setActiveView] = useState("Overview");
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><HeartPulse size={21}/></div><div><b>caremesh</b><small>CONNECTED CARE PLATFORM</small></div></div>
      <div className="workspace"><div className="workspace-icon">CN</div><div><b>CareMesh Network</b><small>Enterprise workspace</small></div><ChevronDown size={15}/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{nav.map(([label, Icon], i) => <a href="#" key={label} className={activeView===label?"nav-link active":"nav-link"} onClick={e=>{e.preventDefault(); if(label==="Overview" || label==="Patient records") setActiveView(label);}}><Icon size={17}/><span>{label}</span>{label==="Care coordination"&&<small>8</small>}</a>)}</nav>
      <div className="sidebar-bottom"><a className="nav-link" href="#" onClick={e=>e.preventDefault()}><ShieldCheck size={17}/><span>Security center</span></a><div className="profile"><div className="avatar">AR</div><div><b>Alex Rivera</b><small>Network administrator</small></div><ChevronDown size={15}/></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="crumb">Workspace <span>/</span> <b>Overview</b></div><div className="top-actions"><div className="search"><Search size={15}/> Search anything... <kbd>⌘ K</kbd></div><button className="icon-button" aria-label="Notifications"><Bell size={18}/><i/></button><div className="avatar">AR</div></div></header>
      {activeView === "Patient records" ? <PatientWorkspace /> : <section className="page">
        <div className="welcome"><div><div className="eyebrow"><i/> NETWORK OPERATIONS</div><h1>Good morning, Alex <span>✦</span></h1><p>Here’s what’s happening across your connected care network today.</p></div><button className="date-button"><CalendarDays size={15}/> Today, 22 Nov <ChevronDown size={14}/></button></div>
        <div className="metrics">{metrics.map(({label,value,delta,icon:Icon,tone})=><article className="metric" key={label}><div className="metric-head"><span>{label}</span><div className={`metric-icon ${tone}`}><Icon size={18}/></div></div><strong>{value}</strong><small>{delta}</small></article>)}</div>
        <div className="columns">
          <section className="panel activity"><div className="panel-head"><div><h2>Network activity</h2><p>Live exchange events across your ecosystem</p></div><button className="link-button">View activity <ArrowUpRight size={14}/></button></div>
            <div className="summary"><div><b>1,284</b><small>Events processed today</small></div><div className="bars">{[34,48,42,66,54,77,61,88,70,96,82,100].map((v,i)=><i key={i} style={{height:`${v}%`}}/>)}</div></div>
            <div className="table-scroll"><table><thead><tr><th>ORGANIZATION</th><th>EVENT</th><th>TIME</th><th>STATUS</th></tr></thead><tbody>{events.map(([initials,name,detail,time,status,tone])=><tr key={name}><td><div className="org"><i>{initials}</i><b>{name}</b></div></td><td>{detail}</td><td className="muted">{time}</td><td><span className={`status ${tone}`}>{status}</span></td></tr>)}</tbody></table></div>
          </section>
          <aside className="right">
            <section className="panel health"><div className="panel-head"><div><h2>Network health</h2><p>Integration service status</p></div><span className="healthy">● Healthy</span></div><div className="score"><b>98.6<span>%</span></b><small>Overall availability</small></div><div className="track"><i/></div><div className="health-foot"><span>Last 30 days</span><b>+0.4%</b></div>{["API gateway","Event delivery","Identity services"].map(x=><div className="service" key={x}><span><i/> {x}</span><b>Operational</b></div>)}</section>
            <section className="insight"><div className="insight-icon"><Activity size={18}/></div><small>NETWORK INSIGHT</small><h3>Referral response times improved</h3><p>Average acknowledgement time is down 18% this week across connected providers.</p><button>Explore insight <ArrowUpRight size={14}/></button></section>
          </aside>
        </div>
        <footer>CareMesh platform foundation · Synthetic demo data <span>System status <i/> All systems operational</span></footer>
      </section>}
    </main>
  </div>;
}
