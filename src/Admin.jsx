import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://phztevkpvtpvrbpirmcp.supabase.co";
const SUPABASE_KEY = "sb_publishable_eupIj0zcm1pCt_SKGfZCuQ_ZoR-1pQl";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_PASSWORD = "unmarked2025";

const BG="#080808", CARD="#111", EDGE="#1e1e1e", ACCENT="#C8FF00", WHITE="#efefef", DIM="#888";
const MONO="'Courier New',monospace", SANS="'Helvetica Neue',Arial,sans-serif", BLACK="'Arial Black','Helvetica Neue',sans-serif";

function exportCSV(registrations, entries) {
  const rows = [["Name","Phone","Email","Points","Tasks Done","Draw Submitted","Prize","Registered At"]];
  registrations.forEach(r => {
    const entry = entries.find(e => e.id === r.phone?.replace(/\s+/g,""));
    rows.push([
      r.name, r.phone, r.email||"",
      entry?.points||0,
      Object.keys(entry?.vendor_stamps||{}).length + (entry?.solo_completed||[]).length,
      entry?.draw_submitted?"Yes":"No",
      entry?.prize_label||"",
      r.created_at,
    ]);
  });
  const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], {type:"text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "passport-unmarked-data.csv";
  a.click();
}

async function downloadAllPhotos(uploads) {
  // Download photos one by one with a small delay
  for(let i = 0; i < uploads.length; i++) {
    const img = uploads[i];
    try {
      const response = await fetch(img.url);
      const blob = await response.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${img.name}_${img.taskId}.jpg`.replace(/\s+/g,"_");
      a.click();
      URL.revokeObjectURL(a.href);
      await new Promise(r => setTimeout(r, 300));
    } catch(e) { console.error("Failed to download", img.url); }
  }
}

export default function Admin() {
  const [authed, setAuthed]           = useState(false);
  const [pw, setPw]                   = useState("");
  const [pwErr, setPwErr]             = useState(false);
  const [registrations, setRegs]      = useState([]);
  const [entries, setEntries]         = useState([]);
  const [uploads, setUploads]         = useState([]);
  const [tab, setTab]                 = useState("registrations");
  const [selectedImg, setSelectedImg] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [search, setSearch]           = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [downloading, setDownloading]  = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const load = async () => {
    setLoading(true);
    const [{ data: regs }, { data: ents }] = await Promise.all([
      supabase.from("registrations").select("*").order("created_at", { ascending: false }),
      supabase.from("entries").select("*").order("points", { ascending: false }),
    ]);
    setRegs(regs || []);
    setEntries(ents || []);
    // Collect all uploaded image URLs from entries
    const imgs = [];
    (ents || []).forEach(e => {
      if(e.uploads) {
        Object.entries(e.uploads).forEach(([taskId, url]) => {
          if(url && url.startsWith("http")) {
            imgs.push({ name: e.name, taskId, url, points: e.points });
          }
        });
      }
    });
    setUploads(imgs);
    setLastRefresh(new Date().toLocaleTimeString());
    setLoading(false);
  };

  useEffect(() => {
    if(!authed) return;
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [authed]);

  if(!authed) return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:SANS}}>
      <div style={{background:CARD,border:`1px solid ${EDGE}`,padding:"40px",width:320}}>
        <div style={{fontSize:10,color:ACCENT,letterSpacing:"0.35em",fontFamily:MONO,marginBottom:12}}>UNMARKED ADMIN</div>
        <div style={{fontSize:22,fontWeight:900,color:WHITE,fontFamily:BLACK,marginBottom:24}}>STAFF ACCESS</div>
        <input
          style={{width:"100%",background:BG,border:`1px solid ${EDGE}`,color:WHITE,padding:"12px",fontSize:14,fontFamily:SANS,outline:"none",boxSizing:"border-box",marginBottom:12}}
          type="password" placeholder="Enter admin password"
          value={pw} onChange={e=>setPw(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&(pw===ADMIN_PASSWORD?setAuthed(true):setPwErr(true))}
        />
        {pwErr && <div style={{color:"#ff5555",fontSize:12,fontFamily:MONO,marginBottom:8}}>Incorrect password</div>}
        <button
          style={{width:"100%",background:ACCENT,color:"#000",border:"none",padding:"14px",fontSize:12,fontWeight:900,letterSpacing:"0.15em",cursor:"pointer",fontFamily:BLACK}}
          onClick={()=>pw===ADMIN_PASSWORD?setAuthed(true):setPwErr(true)}
        >ENTER</button>
      </div>
    </div>
  );

  const filteredRegs = registrations.filter(r =>
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.phone?.includes(search) ||
    r.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPoints = entries.reduce((s,e)=>s+e.points,0);
  const drawEntries = entries.filter(e=>e.draw_submitted).length;

  return (
    <div style={{minHeight:"100vh",background:BG,color:WHITE,fontFamily:SANS}}>
      {/* Top bar */}
      <div style={{background:CARD,borderBottom:`1px solid ${EDGE}`,padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10}}>
        <div>
          <div style={{fontSize:10,color:ACCENT,letterSpacing:"0.35em",fontFamily:MONO}}>UNMARKED ADMIN</div>
          <div style={{fontSize:18,fontWeight:900,color:WHITE,fontFamily:BLACK}}>PASSPORT DASHBOARD</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {lastRefresh && <span style={{fontSize:10,color:DIM,fontFamily:MONO}}>Updated {lastRefresh}</span>}
          <button onClick={load} style={{background:EDGE,border:"none",color:WHITE,padding:"8px 14px",fontSize:11,cursor:"pointer",fontFamily:MONO,letterSpacing:"0.1em"}}>
            {loading?"...":"↻ REFRESH"}
          </button>
          <button onClick={()=>exportCSV(registrations,entries)} style={{background:ACCENT,border:"none",color:"#000",padding:"8px 14px",fontSize:11,fontWeight:900,cursor:"pointer",fontFamily:BLACK,letterSpacing:"0.1em"}}>
            ↓ EXPORT CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:2,padding:"2px"}}>
        {[
          {label:"REGISTERED",   value: registrations.length},
          {label:"ACTIVE",       value: entries.length},
          {label:"DRAW ENTRIES", value: drawEntries},
          {label:"PHOTOS",       value: uploads.length},
        ].map(s=>(
          <div key={s.label} style={{background:CARD,padding:"20px",textAlign:"center"}}>
            <div style={{fontSize:32,fontWeight:900,color:ACCENT,fontFamily:BLACK}}>{s.value}</div>
            <div style={{fontSize:10,color:DIM,letterSpacing:"0.3em",fontFamily:MONO,marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:`1px solid ${EDGE}`,padding:"0 24px"}}>
        {[
          {id:"registrations", label:`REGISTRATIONS (${registrations.length})`},
          {id:"leaderboard",   label:`LEADERBOARD (${entries.length})`},
          {id:"photos",        label:`PHOTOS (${uploads.length})`},
        ].map(t=>(
          <button key={t.id}
            style={{background:"none",border:"none",borderBottom:tab===t.id?`2px solid ${ACCENT}`:"2px solid transparent",color:tab===t.id?ACCENT:DIM,padding:"14px 16px",fontSize:11,letterSpacing:"0.2em",cursor:"pointer",fontFamily:MONO}}
            onClick={()=>setTab(t.id)}
          >{t.label}</button>
        ))}
      </div>

      {/* Search */}
      {tab!=="photos" && (
        <div style={{padding:"16px 24px"}}>
          <input
            style={{width:"100%",maxWidth:400,background:CARD,border:`1px solid ${EDGE}`,color:WHITE,padding:"10px 14px",fontSize:13,fontFamily:SANS,outline:"none",boxSizing:"border-box"}}
            placeholder="Search by name, phone or email..."
            value={search} onChange={e=>setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Registrations tab */}
      {tab==="registrations" && (
        <div style={{padding:"0 24px 40px"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${EDGE}`}}>
                {["NAME","PHONE","EMAIL","REGISTERED"].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:10,letterSpacing:"0.2em",color:DIM,fontFamily:MONO}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRegs.map((r,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${EDGE}`,background:i%2===0?"transparent":CARD}}>
                  <td style={{padding:"12px"}}>{r.name}</td>
                  <td style={{padding:"12px",fontFamily:MONO,fontSize:12}}>{r.phone}</td>
                  <td style={{padding:"12px",color:DIM,fontSize:12}}>{r.email||"—"}</td>
                  <td style={{padding:"12px",color:DIM,fontSize:11,fontFamily:MONO}}>{new Date(r.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leaderboard tab */}
      {tab==="leaderboard" && (
        <div style={{padding:"0 24px 40px"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${EDGE}`}}>
                {["#","NAME","POINTS","PRIZE","DRAW","TASKS"].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"10px 12px",fontSize:10,letterSpacing:"0.2em",color:DIM,fontFamily:MONO}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.filter(e=>e.name?.toLowerCase().includes(search.toLowerCase())).map((e,i)=>(
                <tr key={i} style={{borderBottom:`1px solid ${EDGE}`,background:i%2===0?"transparent":CARD}}>
                  <td style={{padding:"12px",color:DIM,fontFamily:MONO}}>{i+1}</td>
                  <td style={{padding:"12px",fontWeight:700}}>{e.name}</td>
                  <td style={{padding:"12px",color:ACCENT,fontWeight:900,fontFamily:BLACK,fontSize:18}}>{e.points}</td>
                  <td style={{padding:"12px",fontSize:12,color:DIM}}>{e.prize_label||"—"}</td>
                  <td style={{padding:"12px"}}>
                    <span style={{background:e.draw_submitted?"#0d1a00":"transparent",color:e.draw_submitted?ACCENT:DIM,border:`1px solid ${e.draw_submitted?ACCENT:EDGE}`,padding:"2px 8px",fontSize:10,fontFamily:MONO}}>
                      {e.draw_submitted?"ENTERED":"—"}
                    </span>
                  </td>
                  <td style={{padding:"12px",color:DIM,fontSize:12,fontFamily:MONO}}>
                    {Object.keys(e.vendor_stamps||{}).length + (e.solo_completed||[]).length} tasks
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Photos tab */}
      {tab==="photos" && (
        <div style={{padding:"24px"}}>
          {/* Download all button */}
          {uploads.length > 0 && (
            <div style={{marginBottom:20,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <button
                style={{background:ACCENT,border:"none",color:"#000",padding:"12px 24px",fontSize:12,fontWeight:900,letterSpacing:"0.15em",cursor:downloading?"not-allowed":"pointer",fontFamily:"'Arial Black',sans-serif",opacity:downloading?0.6:1}}
                onClick={async()=>{
                  if(downloading) return;
                  setDownloading(true);
                  for(let i=0;i<uploads.length;i++){
                    setDownloadProgress(i+1);
                    const img=uploads[i];
                    try{
                      const response=await fetch(img.url);
                      const blob=await response.blob();
                      const a=document.createElement("a");
                      a.href=URL.createObjectURL(blob);
                      a.download=`${img.name}_${img.taskId}.jpg`.replace(/\s+/g,"_");
                      a.click();
                      URL.revokeObjectURL(a.href);
                      await new Promise(r=>setTimeout(r,400));
                    }catch(e){console.error("Failed",img.url);}
                  }
                  setDownloading(false);
                  setDownloadProgress(0);
                }}
              >
                {downloading ? `DOWNLOADING ${downloadProgress}/${uploads.length}...` : `↓ DOWNLOAD ALL ${uploads.length} PHOTOS`}
              </button>
              <div style={{fontSize:11,color:DIM,fontFamily:MONO}}>
                {uploads.filter(u=>u.url.includes("saturday")).length} Saturday · {uploads.filter(u=>u.url.includes("sunday")).length} Sunday
              </div>
            </div>
          )}
          {/* Filter by day */}
          {uploads.length > 0 && (
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {["all","saturday","sunday"].map(d=>(
                <button key={d}
                  style={{background:"none",border:`1px solid ${EDGE}`,color:DIM,padding:"6px 14px",fontSize:10,letterSpacing:"0.2em",cursor:"pointer",fontFamily:MONO}}
                  onClick={e=>{
                    const btns=e.target.parentNode.querySelectorAll("button");
                    btns.forEach(b=>{b.style.borderColor=EDGE;b.style.color=DIM;});
                    e.target.style.borderColor=ACCENT;e.target.style.color=ACCENT;
                  }}
                >{d.toUpperCase()}</button>
              ))}
            </div>
          )}
          {uploads.length===0 && <div style={{color:DIM,fontFamily:MONO,fontSize:12,padding:"24px 0"}}>No photos uploaded yet</div>}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
            {uploads.map((img,i)=>(
              <div key={i} style={{background:CARD,border:`1px solid ${EDGE}`,overflow:"hidden"}}>
                <div style={{position:"relative",cursor:"pointer"}} onClick={()=>setSelectedImg(img)}>
                  <img src={img.url} alt="" style={{width:"100%",height:160,objectFit:"cover",display:"block"}}/>
                  <div style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.7)",padding:"2px 8px",fontSize:9,fontFamily:MONO,color:WHITE,letterSpacing:"0.1em"}}>
                    {img.url.includes("saturday")?"SAT":"SUN"}
                  </div>
                </div>
                <div style={{padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:WHITE}}>{img.name}</div>
                    <div style={{fontSize:10,color:DIM,fontFamily:MONO,marginTop:2}}>{img.taskId} · {img.points}pts</div>
                  </div>
                  <a href={img.url} download={`${img.name}_${img.taskId}.jpg`} target="_blank" rel="noreferrer"
                    style={{color:ACCENT,fontSize:18,textDecoration:"none"}} title="Download">↓</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {selectedImg && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.95)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,flexDirection:"column",gap:16}}
          onClick={()=>setSelectedImg(null)}>
          <img src={selectedImg.url} alt="" style={{maxWidth:"90vw",maxHeight:"80vh",objectFit:"contain"}}/>
          <div style={{color:WHITE,fontFamily:BLACK,fontSize:16}}>{selectedImg.name}</div>
          <div style={{color:DIM,fontFamily:MONO,fontSize:12}}>{selectedImg.taskId} · tap anywhere to close</div>
        </div>
      )}
    </div>
  );
}
