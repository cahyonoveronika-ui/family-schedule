import { useState, useEffect } from "react";

const SUPABASE_URL = "https://sxfyzbjkmyhculyazaak.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4Znl6YmprbXloY3VseWF6YWFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDY1MDcsImV4cCI6MjA5ODIyMjUwN30.FaPUiY3tO1SSu74mfkr5tGUM9cOeUfy-g4qR5flpJGs";

const HEADERS = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation",
};

async function getEvents() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/events?order=date.asc,time.asc`, { headers: HEADERS });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function postEvent(data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function removeEvent(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${id}`, {
    method: "DELETE",
    headers: HEADERS,
  });
  if (!res.ok) throw new Error(await res.text());
}

// ─────────────────────────────────────────────────────────

const MEMBERS = [
  { id: "dad",   label: "Dad",   emoji: "👨", color: "#4A7BC8", bg: "#E3EBF9" },
  { id: "mom",   label: "Mom",   emoji: "👩", color: "#C85A8A", bg: "#FAEBF2" },
  { id: "sean",  label: "Sean",  emoji: "🧒", color: "#5BAD8C", bg: "#E6F4EE" },
  { id: "zac",   label: "Zac",   emoji: "🧒", color: "#E07B4F", bg: "#FCEEE6" },
  { id: "ace",   label: "Ace",   emoji: "🧒", color: "#A569BD", bg: "#F3EAF9" },
  { id: "chase", label: "Chase", emoji: "🧒", color: "#E8A825", bg: "#FDF4E1" },
];

const MONTHS_FULL = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];
const DAYS_SHORT   = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

function getMember(id) { return MEMBERS.find(m => m.id === id) || MEMBERS[0]; }

function todayStr() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;
}

function formatDate(ds) {
  const d = new Date(ds + "T00:00:00");
  return `${DAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function daysInMonth(y, m) { return new Date(y, m+1, 0).getDate(); }
function firstDayOf(y, m)  { return new Date(y, m, 1).getDay(); }

function groupByDate(list) {
  const map = {};
  list.forEach(e => { if (!map[e.date]) map[e.date] = []; map[e.date].push(e); });
  return Object.entries(map).sort(([a],[b]) => a.localeCompare(b));
}

// ─────────────────────────────────────────────────────────

export default function App() {
  const now = new Date();
  const [events, setEvents]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [errMsg, setErrMsg]     = useState(null);
  const [filter, setFilter]     = useState("semua");
  const [tab, setTab]           = useState("list");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ date: todayStr(), time: "", member: "dad", note: "" });
  const [calYear, setCalYear]   = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calSel, setCalSel]     = useState(null);

  const TODAY = todayStr();

  async function loadEvents() {
    setLoading(true); setErrMsg(null);
    try { setEvents(await getEvents()); }
    catch { setErrMsg("Gagal memuat. Cek koneksi internet."); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadEvents(); }, []);

  async function addEvent() {
    if (!form.note.trim() || !form.date) return;
    setSaving(true);
    try {
      const saved = await postEvent({ member: form.member, date: form.date, time: form.time || null, note: form.note });
      setEvents(prev => [...prev, ...(Array.isArray(saved) ? saved : [saved])].sort((a,b) => a.date.localeCompare(b.date) || (a.time||"").localeCompare(b.time||"")));
      setForm({ date: TODAY, time: "", member: "dad", note: "" });
      setShowForm(false);
    } catch(e) {
      alert("Gagal menyimpan: " + e.message);
    } finally { setSaving(false); }
  }

  async function deleteEvent(id) {
    setEvents(prev => prev.filter(e => e.id !== id)); // optimistic
    try { await removeEvent(id); }
    catch { loadEvents(); } // revert on fail
  }

  // derived
  const visible  = events.filter(e => filter === "semua" || e.member === filter);
  const upcoming = visible.filter(e => e.date >= TODAY);
  const past     = visible.filter(e => e.date < TODAY);

  // calendar helpers
  const totalDays = daysInMonth(calYear, calMonth);
  const startDay  = firstDayOf(calYear, calMonth);
  function calDs(d) { return `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
  function calDayEvs(d) { return events.filter(e => e.date === calDs(d) && (filter==="semua" || e.member===filter)); }
  const calSelEvs = calSel ? events.filter(e => e.date===calSel && (filter==="semua"||e.member===filter)) : [];

  function prevCal() { calMonth===0 ? (setCalMonth(11),setCalYear(calYear-1)) : setCalMonth(calMonth-1); }
  function nextCal() { calMonth===11 ? (setCalMonth(0),setCalYear(calYear+1)) : setCalMonth(calMonth+1); }

  // ── styles
  const pill = (a,c,bg) => ({ padding:"5px 14px", borderRadius:20, border:"none", cursor:"pointer", whiteSpace:"nowrap", fontWeight:700, fontSize:13, background:a?c:bg||"#EEF3FC", color:a?"#fff":c, flexShrink:0 });
  const inp  = { width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #D0DDEF", fontSize:14, boxSizing:"border-box", background:"#fff", color:"#1A2340", marginBottom:10, outline:"none" };

  function EventCard({ ev }) {
    const m = getMember(ev.member);
    return (
      <div style={{ display:"flex", gap:12, alignItems:"flex-start", background:m.bg, borderRadius:14, padding:"12px 14px", marginBottom:9, boxShadow:"0 1px 4px rgba(74,123,200,0.07)" }}>
        <div style={{ width:40, height:40, borderRadius:10, background:m.color, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:16, flexShrink:0 }}>
          <span>{m.emoji}</span>
          <span style={{fontSize:9,marginTop:1}}>{m.label}</span>
        </div>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:15,color:"#1A2340"}}>{ev.note}</div>
          <div style={{marginTop:4}}>
            <span style={{display:"inline-block",padding:"2px 8px",borderRadius:6,background:"#fff",color:m.color,fontSize:11,fontWeight:700,marginRight:6}}>{m.label}</span>
            {ev.time && <span style={{fontSize:12,color:"#8A9BBC"}}>⏰ {ev.time}</span>}
          </div>
        </div>
        <button onClick={()=>deleteEvent(ev.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#C5D0E0",fontSize:22,lineHeight:1,padding:"0 4px"}}>×</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#F0F4FA", fontFamily:"'Segoe UI',system-ui,sans-serif", color:"#1A2340", maxWidth:480, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ background:"#fff", borderBottom:"1px solid #E2EAF4", padding:"14px 18px", position:"sticky", top:0, zIndex:10 }}>
        <div style={{fontSize:20,fontWeight:800,color:"#1A2340",letterSpacing:-0.5}}>🏠 Family Schedule</div>
        <div style={{fontSize:12,color:"#8A9BBC",marginTop:1,display:"flex",alignItems:"center",gap:8}}>
          Dad · Mom · Sean · Zac · Ace · Chase
          <button onClick={loadEvents} style={{background:"none",border:"none",cursor:"pointer",color:"#4A7BC8",fontSize:13,padding:0,fontWeight:700}}>⟳ Refresh</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",background:"#fff",borderBottom:"1px solid #E2EAF4",padding:"0 18px"}}>
        {["list","calendar"].map(t => (
          <button key={t} onClick={()=>setTab(t)} style={{padding:"11px 18px",fontWeight:700,fontSize:14,border:"none",background:"none",cursor:"pointer",color:tab===t?"#4A7BC8":"#8A9BBC",borderBottom:tab===t?"2px solid #4A7BC8":"2px solid transparent"}}>
            {t==="list" ? "📋 Semua Jadwal" : "📅 Kalender"}
          </button>
        ))}
      </div>

      {/* Filter pills */}
      <div style={{display:"flex",gap:8,overflowX:"auto",padding:"12px 16px",background:"#fff",borderBottom:"1px solid #E2EAF4"}}>
        <button style={pill(filter==="semua","#1A2340","#EEF3FC")} onClick={()=>setFilter("semua")}>👨‍👩‍👧‍👦 Semua</button>
        {MEMBERS.map(m => (
          <button key={m.id} style={pill(filter===m.id,m.color,m.bg)} onClick={()=>setFilter(m.id)}>{m.emoji} {m.label}</button>
        ))}
      </div>

      {/* Body */}
      <div style={{padding:"14px 16px"}}>

        {loading && (
          <div style={{textAlign:"center",padding:"40px 0",color:"#8A9BBC"}}>
            <div style={{fontSize:32,marginBottom:8}}>⏳</div>Memuat jadwal...
          </div>
        )}

        {errMsg && !loading && (
          <div style={{background:"#FEE2E2",borderRadius:12,padding:16,textAlign:"center",color:"#B91C1C",marginBottom:12}}>
            {errMsg}
            <button onClick={loadEvents} style={{display:"block",margin:"10px auto 0",background:"#B91C1C",color:"#fff",border:"none",borderRadius:8,padding:"6px 16px",cursor:"pointer",fontWeight:700}}>Coba Lagi</button>
          </div>
        )}

        {/* LIST */}
        {!loading && !errMsg && tab==="list" && (
          <>
            {upcoming.length===0 && past.length===0 && (
              <div style={{textAlign:"center",color:"#8A9BBC",padding:"40px 0",fontSize:14}}>
                Belum ada jadwal.<br/>Tap tombol di bawah untuk tambah! 👇
              </div>
            )}
            {upcoming.length > 0 && (
              <>
                <div style={{fontSize:12,fontWeight:700,color:"#8A9BBC",marginBottom:7,textTransform:"uppercase",letterSpacing:0.5}}>📌 Mendatang</div>
                {groupByDate(upcoming).map(([date,evs]) => (
                  <div key={date}>
                    <div style={{fontSize:13,fontWeight:700,color:"#4A7BC8",margin:"10px 0 6px",paddingLeft:2}}>
                      {formatDate(date)}
                      {date===TODAY && <span style={{marginLeft:6,fontSize:11,background:"#4A7BC8",color:"#fff",borderRadius:5,padding:"1px 6px"}}>Hari ini</span>}
                    </div>
                    {evs.map(ev => <EventCard key={ev.id} ev={ev}/>)}
                  </div>
                ))}
              </>
            )}
            {past.length > 0 && (
              <>
                <div style={{fontSize:12,fontWeight:700,color:"#8A9BBC",marginBottom:7,marginTop:18,textTransform:"uppercase",letterSpacing:0.5}}>🕐 Sudah lewat</div>
                {groupByDate([...past].reverse()).map(([date,evs]) => (
                  <div key={date} style={{opacity:0.5}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#8A9BBC",margin:"10px 0 6px",paddingLeft:2}}>{formatDate(date)}</div>
                    {evs.map(ev => <EventCard key={ev.id} ev={ev}/>)}
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* CALENDAR */}
        {!loading && !errMsg && tab==="calendar" && (
          <>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <button onClick={prevCal} style={{background:"#EEF3FC",border:"none",borderRadius:8,padding:"6px 16px",cursor:"pointer",fontSize:18,color:"#4A7BC8"}}>‹</button>
              <span style={{fontWeight:800,fontSize:16,color:"#1A2340"}}>{MONTHS_FULL[calMonth]} {calYear}</span>
              <button onClick={nextCal} style={{background:"#EEF3FC",border:"none",borderRadius:8,padding:"6px 16px",cursor:"pointer",fontSize:18,color:"#4A7BC8"}}>›</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:4}}>
              {DAYS_SHORT.map(d => <div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:"#8A9BBC"}}>{d}</div>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:16}}>
              {Array(startDay).fill(null).map((_,i) => <div key={"b"+i}/>)}
              {Array(totalDays).fill(null).map((_,i) => {
                const day=i+1, ds=calDs(day), evs=calDayEvs(day);
                const isToday=ds===TODAY, isSel=ds===calSel;
                return (
                  <div key={day} onClick={()=>setCalSel(isSel?null:ds)}
                    style={{minHeight:48,borderRadius:10,padding:"5px 3px 3px",background:isSel?"#4A7BC8":isToday?"#EEF3FC":"#fff",border:isToday&&!isSel?"2px solid #4A7BC8":"2px solid transparent",cursor:"pointer",boxShadow:"0 1px 3px rgba(74,123,200,0.06)",textAlign:"center"}}>
                    <div style={{fontSize:13,fontWeight:700,color:isSel?"#fff":isToday?"#4A7BC8":"#1A2340",marginBottom:3}}>{day}</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:2,justifyContent:"center"}}>
                      {evs.slice(0,3).map(ev => { const m=getMember(ev.member); return <div key={ev.id} style={{width:6,height:6,borderRadius:"50%",background:isSel?"rgba(255,255,255,0.8)":m.color}}/>; })}
                      {evs.length>3 && <span style={{fontSize:8,color:isSel?"#fff":"#8A9BBC"}}>+{evs.length-3}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            {calSel && (
              <div style={{background:"#fff",borderRadius:14,padding:16,boxShadow:"0 2px 8px rgba(74,123,200,0.09)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{fontWeight:700,fontSize:15,color:"#1A2340"}}>{formatDate(calSel)}</div>
                  <button onClick={()=>{setForm({...form,date:calSel});setShowForm(true);}} style={{background:"#4A7BC8",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",cursor:"pointer",fontWeight:700,fontSize:13}}>+ Tambah</button>
                </div>
                {calSelEvs.length===0
                  ? <div style={{color:"#8A9BBC",textAlign:"center",padding:"16px 0",fontSize:13}}>Belum ada jadwal hari ini</div>
                  : calSelEvs.map(ev => <EventCard key={ev.id} ev={ev}/>)
                }
              </div>
            )}
          </>
        )}

        <div style={{height:80}}/>
      </div>

      {/* FAB */}
      {!loading && (
        <button onClick={()=>{setForm({date:TODAY,time:"",member:"dad",note:""});setShowForm(true);}}
          style={{position:"fixed",bottom:24,right:"50%",transform:"translateX(50%)",maxWidth:448,width:"calc(100% - 32px)",background:"#4A7BC8",color:"#fff",border:"none",borderRadius:14,padding:"14px 0",cursor:"pointer",fontWeight:700,fontSize:16,boxShadow:"0 4px 16px rgba(74,123,200,0.35)",zIndex:20}}>
          + Tambah Jadwal
        </button>
      )}

      {/* Form modal */}
      {showForm && (
        <div onClick={e=>{if(e.target===e.currentTarget)setShowForm(false);}}
          style={{position:"fixed",inset:0,background:"rgba(20,32,64,0.4)",zIndex:30,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:"20px 18px 36px",width:"100%",maxWidth:480,boxSizing:"border-box"}}>
            <div style={{fontWeight:800,fontSize:17,marginBottom:16,color:"#1A2340"}}>Tambah Jadwal Baru</div>

            <div style={{fontSize:12,fontWeight:700,color:"#8A9BBC",marginBottom:6}}>UNTUK SIAPA</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
              {MEMBERS.map(m => (
                <button key={m.id} onClick={()=>setForm({...form,member:m.id})}
                  style={{padding:"6px 14px",borderRadius:20,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,background:form.member===m.id?m.color:m.bg,color:form.member===m.id?"#fff":m.color}}>
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>

            <div style={{fontSize:12,fontWeight:700,color:"#8A9BBC",marginBottom:4}}>TANGGAL</div>
            <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={inp}/>

            <div style={{fontSize:12,fontWeight:700,color:"#8A9BBC",marginBottom:4}}>JAM (opsional)</div>
            <input type="time" value={form.time} onChange={e=>setForm({...form,time:e.target.value})} style={inp}/>

            <div style={{fontSize:12,fontWeight:700,color:"#8A9BBC",marginBottom:4}}>KETERANGAN</div>
            <input type="text" placeholder="Contoh: Les piano, Vaksin, Meeting..."
              value={form.note} onChange={e=>setForm({...form,note:e.target.value})}
              onKeyDown={e=>e.key==="Enter"&&addEvent()} style={inp}/>

            <div style={{display:"flex",gap:10,marginTop:4}}>
              <button onClick={addEvent} disabled={saving}
                style={{flex:1,background:"#4A7BC8",color:"#fff",border:"none",borderRadius:12,padding:"13px 0",cursor:"pointer",fontWeight:700,fontSize:15,opacity:saving?0.7:1}}>
                {saving?"Menyimpan...":"✓ Simpan"}
              </button>
              <button onClick={()=>setShowForm(false)}
                style={{flex:1,background:"#EEF3FC",color:"#4A7BC8",border:"none",borderRadius:12,padding:"13px 0",cursor:"pointer",fontWeight:700,fontSize:15}}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
