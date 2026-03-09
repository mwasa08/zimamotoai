import { useState, useRef, useEffect } from "react";
import * as mammoth from "mammoth";
import { Analytics } from "@vercel/analytics/react"

// ─── PUTER.JS LOADER ──────────────────────────────────────────────────────────
// Dynamically loads puter.js — no API key needed, free Claude access
function usePuter() {
  const [ready, setReady] = useState(!!window.puter);
  useEffect(() => {
    if (window.puter) { setReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://js.puter.com/v2/";
    script.async = true;
    script.onload = () => setReady(true);
    script.onerror = () => console.error("Failed to load Puter.js");
    document.head.appendChild(script);
  }, []);
  return ready;
}

// ─── CORE AI CALL (Puter.js — Free, No API Key) ───────────────────────────────
// Standard call — returns full text
async function callAI(messages, system = "", maxTokens = 1000) {
  const puterMsgs = system
    ? [{ role: "system", content: system }, ...messages]
    : messages;
  const response = await window.puter.ai.chat(puterMsgs, {
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
  });
  return response.message.content[0].text;
}

// Streaming call — calls onChunk(text) as tokens arrive, returns full text
async function callAIStream(messages, system = "", onChunk, maxTokens = 1000) {
  const puterMsgs = system
    ? [{ role: "system", content: system }, ...messages]
    : messages;
  const stream = await window.puter.ai.chat(puterMsgs, {
    model: "claude-sonnet-4-6",
    stream: true,
    max_tokens: maxTokens,
  });
  let full = "";
  for await (const part of stream) {
    const chunk = part?.text || "";
    full += chunk;
    onChunk(full);
  }
  return full;
}

// ─── FILE HELPERS ─────────────────────────────────────────────────────────────
const readAsArrayBuffer = (file) =>
  new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsArrayBuffer(file); });
const readAsBase64 = (file) =>
  new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });

// ─── STATIC DATA ──────────────────────────────────────────────────────────────
const MAJORS = [
  { id: "science", label: "Science & Mathematics", icon: "⚛️", color: "#3B82F6" },
  { id: "social", label: "Social Sciences", icon: "🌍", color: "#10B981" },
  { id: "business", label: "Business & Economics", icon: "📈", color: "#F59E0B" },
  { id: "law", label: "Law & Governance", icon: "⚖️", color: "#EF4444" },
  { id: "humanities", label: "Humanities & Arts", icon: "🎭", color: "#8B5CF6" },
  { id: "ict", label: "ICT & Engineering", icon: "💻", color: "#06B6D4" },
  { id: "medical", label: "Medical & Health Sciences", icon: "🏥", color: "#EC4899" },
  { id: "development", label: "Development Studies", icon: "🌱", color: "#84CC16" },
  { id: "education", label: "Education", icon: "📚", color: "#F97316" },
  { id: "agriculture", label: "Agriculture & Environment", icon: "🌾", color: "#65A30D" },
];

const DISCUSSION_ROOMS = [
  { id: 1, subject: "Calculus III", major: "science", members: 14, active: true, host: "Mwasa S", topic: "Integration techniques for final exam", msgs: 47 },
  { id: 2, subject: "Constitutional Law", major: "law", members: 9, active: true, host: "Yassin J.", topic: "Case study: Marbury v. Madison", msgs: 23 },
  { id: 3, subject: "Microeconomics", major: "business", members: 21, active: true, host: "Dr.Grace ", topic: "Market equilibrium problems", msgs: 88 },
  { id: 4, subject: "Data Structures", major: "ict", members: 17, active: false, host: "Ree O.", topic: "Trees and Graph algorithms", msgs: 34 },
  { id: 5, subject: "Organic Chemistry", major: "medical", members: 11, active: true, host: "Fatuma S.", topic: "Reaction mechanisms review", msgs: 61 },
  { id: 6, subject: "African History", major: "humanities", members: 6, active: false, host: "Careen K.", topic: "Colonial era political structures", msgs: 19 },
];

const BLOG_POSTS = {
  science: [
    { id: 1, title: "Past Paper: UDSM Mathematics 2023", author: "Mwasa S.", type: "pastpaper", likes: 45, date: "Feb 2024", summary: "Full solutions to all 2023 calculus questions including worked examples for integration and differential equations." },
    { id: 2, title: "How I scored A in Physics without reading the whole textbook", author: "Octavius M.", type: "tip", likes: 112, date: "Jan 2024", summary: "Focus on concepts, not memorization. Here's my method that worked for getting top marks while managing time efficiently." },
    { id: 3, title: "Organic Chemistry Reaction Cheat Sheet", author: "Mwasa S.", type: "material", likes: 78, date: "Mar 2024", summary: "One-page summary of all common organic reactions, conditions and mechanisms you need for your exams." },
  ],
  ict: [
    { id: 4, title: "DSA Past Paper UDSM 2022-2023", author: "Mwasa S.", type: "pastpaper", likes: 67, date: "Dec 2023", summary: "Data structures and algorithms questions with full solutions — sorting, trees, dynamic programming all covered." },
    { id: 5, title: "How to pass Operating Systems in one week", author: "Betty K.", type: "tip", likes: 89, date: "Feb 2024", summary: "Focused revision plan, key topics and shortcut mnemonics to understand OS concepts quickly before exams." },
  ],
  business: [
    { id: 6, title: "Macroeconomics Summary Notes — All Topics", author: "Grace N.", type: "material", likes: 134, date: "Mar 2024", summary: "Comprehensive yet concise notes covering GDP, inflation, monetary policy and international trade." },
    { id: 7, title: "Past Paper: Business Finance 2023", author: "Betty K.", type: "pastpaper", likes: 56, date: "Jan 2024", summary: "NPV, IRR and capital budgeting questions fully solved with step-by-step workings shown clearly." },
  ],
  law: [{ id: 8, title: "Case Law Summary: Tort Law", author: "Ester M.", type: "material", likes: 91, date: "Feb 2024", summary: "Key cases, ratios and legal principles for Tort Law examination." }],
  humanities: [{ id: 9, title: "African Literature: Essay writing tips", author: "Vivian R.", type: "tip", likes: 43, date: "Mar 2024", summary: "Structure your literary analysis essays for maximum marks using the PEE method." }],
  medical: [{ id: 10, title: "Pharmacology MCQ Bank 2023", author: "Farajah S.", type: "pastpaper", likes: 203, date: "Feb 2024", summary: "500 pharmacology questions with answers and detailed explanations covering all drug classes." }],
  social: [{ id: 11, title: "Sociology Theory Notes — Simplified", author: "Maria Y.", type: "material", likes: 61, date: "Jan 2024", summary: "Marx, Durkheim, Weber and modern theorists summarized with real-world East African examples." }],
  development: [{ id: 12, title: "Development Economics Past Paper 2023", author: "Octovius A.", type: "pastpaper", likes: 38, date: "Mar 2024", summary: "All questions with model answers on development indicators and structural transformation." }],
  education: [], agriculture: [],
};

const ADVICE_POSTS = [
  { id: 1, title: "Jinsi ya kuongeza GPA yako kwa semester moja", author: "Mr. Mwasa", avatar: "PM", color: "#F59E0B", category: "Academic", likes: 287, date: "Mar 2024", content: "Njia rahisi na za vitendo za kuboresha alama zako bila msongo wa mawazo.\n\n1. Jua mtihani unajumuisha nini — soma outline ya course yako kwanza.\n2. Tengeneza ratiba ya masomo — angalau saa 2 kila siku.\n3. Jiunge na discussion groups — kufundisha wengine kunakusaidia wewe pia.\n4. Tembelea lecturer wakati wa office hours.\n5. Fanya past papers miaka 3 iliyopita.\n\nUsisahau kupumzika vizuri usiku wa mtihani." },
  { id: 2, title: "How to manage time as a university student", author: "Ms Betty J.", avatar: "AJ", color: "#10B981", category: "Life Skills", likes: 194, date: "Feb 2024", content: "Time management is the #1 skill university students need.\n\nThe Time Block Method:\n• Morning (6-9am): Your hardest subject\n• Afternoon: Group work, assignments, readings\n• Evening: 30-minute review\n\nKey rules:\n1. Plan your week every Sunday night\n2. Turn off your phone during study blocks\n3. Use Pomodoro — 25 min focus, 5 min break\n4. One day per week completely study-free\n\nConsistency beats intensity every time." },
  { id: 3, title: "Mental health: Ukweli kuhusu msongo wa mawazo chuoni", author: "Dr. Grace K.", avatar: "SK", color: "#EC4899", category: "Wellness", likes: 342, date: "Jan 2024", content: "Msongo wa mawazo ni tatizo halisi kwa wanafunzi wengi.\n\nDalili:\n• Usingizi mbaya\n• Kujisikia upweke\n• Kushindwa kujilazimisha kusoma\n\nMbinu za msaada:\n1. Zungumza na mtu unayemwamini\n2. Tembea nje kila siku — hata dakika 20\n3. Tembelea counseling services ya chuo\n\nKukaa kimya hakusaidii. Omba msaada — ni nguvu, si udhaifu." },
  { id: 4, title: "From CGPA 2.1 to 3.8: My honest story", author: "Yassin J.", avatar: "KO", color: "#8B5CF6", category: "Academic", likes: 509, date: "Mar 2024", content: "I was almost suspended after my second semester. CGPA 2.1. Here is exactly what I changed.\n\nWhat actually worked:\n1. Sitting in the front two rows of every lecture\n2. Making friends with the best student in each unit\n3. Starting assignments the day they are given\n4. Going to every consultation hour\n5. Reading at least one week ahead of the syllabus\n\nThe change is possible. Start today, not next semester." },
  { id: 5, title: "Campus internships: How to get one in your 2nd year", author: "Dr. Careen T.", avatar: "BT", color: "#3B82F6", category: "Career", likes: 178, date: "Feb 2024", content: "Most students wait until 4th year. By then it is too late.\n\nHow to get early internships:\n1. Polish your LinkedIn profile\n2. Email companies directly\n3. Attend every career fair on campus\n4. Build a simple portfolio/GitHub if you are in tech\n5. Ask your lecturers — they have industry connections\n\nDon't wait for opportunity. Create it." },
];

const AVATAR_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#F97316"];

// ─── RESPONSIVE HOOK ──────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function ZimamoApp() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState({
    name: "MWASAMBUGHI SAMWEL ELIA", avatar: "ME", color: "#10B981",
    university: "University of Dar es Salaam", major: "ict",
    year: "3rd Year", theme: "dark", lang: "sw", notifications: true,
  });
  const [blogMajor, setBlogMajor] = useState(null);
  const [showMajorPicker, setShowMajorPicker] = useState(false);
  const dark = user.theme === "dark";
  const isMobile = useIsMobile();
  const puterReady = usePuter();

  const navItems = [
    { id: "home", icon: "🤖", label: "Study AI" },
    { id: "discuss", icon: "🗣️", label: "Discussion" },
    { id: "blog", icon: "📖", label: "Blog" },
    { id: "advice", icon: "💡", label: "Advice" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  const handleBlogNav = () => { if (!blogMajor) { setShowMajorPicker(true); return; } setPage("blog"); };
  const handleNav = (id) => { id === "blog" ? handleBlogNav() : setPage(id); };

  const SIDEBAR_W = 240;
  const bg = dark ? "#080C14" : "#F0F4FF";
  const border = dark ? "#1E2D4A" : "#DDE5F5";
  const muted = dark ? "#4A6080" : "#7A8EB0";

  return (
    <div style={{ fontFamily:"'Outfit','Segoe UI',sans-serif", background:bg, minHeight:"100vh", color: dark?"#E8EDF5":"#1a1f2e", display:"flex", flexDirection: isMobile?"column":"row", position:"relative", overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:#2a3a5c;border-radius:4px;}
        textarea,input,select{font-family:inherit;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
        @keyframes spin{to{transform:rotate(360deg);}}
        .fade-up{animation:fadeUp 0.3s ease forwards;}
        .glow-text{font-weight:bold;background:linear-gradient(0deg,#ff4500,#ff8c00,#ffff00,#ff4500);background-size:100% 300%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:fireGlow 2s linear infinite;}
        @keyframes fireGlow{0%{background-position:0% 100%;}50%{background-position:0% 0%;}100%{background-position:0% 100%;}}
        .z-btn{border:none;cursor:pointer;font-family:inherit;font-weight:600;border-radius:12px;transition:all 0.2s;}
        .z-btn-primary{background:linear-gradient(135deg,#00C6FF,#0072FF);color:white;padding:12px 24px;font-size:14px;}
        .z-btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,114,255,0.35);}
        .z-btn-primary:disabled{opacity:0.5;cursor:not-allowed;transform:none;box-shadow:none;}
        .z-input{background:#0D1525;border:1px solid #1E2D4A;border-radius:10px;color:#E8EDF5;padding:11px 14px;font-size:14px;width:100%;outline:none;transition:border-color 0.2s;}
        .z-input:focus{border-color:#0072FF;}
        .upload-zone{border:2px dashed #1E2D4A;border-radius:16px;padding:36px 20px;text-align:center;cursor:pointer;transition:all 0.2s;background:rgba(0,114,255,0.02);}
        .upload-zone:hover{border-color:#0072FF;background:rgba(0,114,255,0.07);}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px);}
        .modal-box{background:#0D1525;border:1px solid #1E2D4A;border-radius:22px;width:100%;max-width:520px;max-height:88vh;overflow-y:auto;padding:24px;}
        .pill-btn{border-radius:20px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid;transition:all 0.2s;white-space:nowrap;flex-shrink:0;}
        .tag{font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;letter-spacing:0.05em;text-transform:uppercase;}
        .nav-bottom{display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;padding:8px 12px;border-radius:12px;transition:all 0.2s;border:none;background:none;font-family:inherit;}
        .nav-bottom.active{background:rgba(0,114,255,0.15);}
        .nav-side{display:flex;align-items:center;gap:12px;padding:11px 16px;border-radius:12px;cursor:pointer;border:none;background:none;font-family:inherit;width:100%;text-align:left;transition:all 0.2s;font-size:14px;font-weight:500;}
        .nav-side:hover{background:rgba(0,114,255,0.1);}
        .nav-side.active{background:rgba(0,114,255,0.18);color:#0072FF;font-weight:700;}
        .puter-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);border-radius:20px;padding:3px 10px;font-size:10px;font-weight:700;color:#10B981;}
        .spinner{width:12px;height:12px;border:2px solid rgba(16,185,129,0.3);border-top-color:#10B981;border-radius:50%;animation:spin 0.8s linear infinite;flex-shrink:0;}
        .dots-stream{display:inline-flex;gap:4px;align-items:center;}
        .dot{width:6px;height:6px;border-radius:50%;background:#0072FF;display:inline-block;}
      `}</style>

      <div style={{ position:"fixed", top:-120, right:-100, width:400, height:400, background:"radial-gradient(circle, rgba(0,114,255,0.07) 0%, transparent 70%)", pointerEvents:"none", zIndex:0 }} />
      <div style={{ position:"fixed", bottom:80, left:-80, width:300, height:300, background:"radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)", pointerEvents:"none", zIndex:0 }} />

      {/* ── DESKTOP SIDEBAR ── */}
      {!isMobile && (
        <aside style={{ position:"fixed", left:0, top:0, bottom:0, width:SIDEBAR_W, background: dark?"rgba(8,12,20,0.98)":"rgba(240,244,255,0.98)", borderRight:`1px solid ${border}`, display:"flex", flexDirection:"column", padding:"24px 14px", zIndex:50, backdropFilter:"blur(20px)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, paddingLeft:4 }}>
            <div style={{ width:38, height:38, background:"linear-gradient(135deg,#00C6FF,#0072FF)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🔥</div>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:800 }} className="glow-text">ZIMAMOTO</div>
              <div style={{ fontSize:10, color:muted }}>Study AI · v1.0</div>
            </div>
          </div>

     

          <nav style={{ display:"flex", flexDirection:"column", gap:4, flex:1 }}>
            {navItems.map(item => (
              <button key={item.id} className={`nav-side ${page===item.id?"active":""}`}
                style={{ color: page===item.id?"#0072FF":(dark?"#A0B0CC":"#4A5568") }}
                onClick={() => handleNav(item.id)}>
                <span style={{ fontSize:20, width:28, textAlign:"center" }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div style={{ borderTop:`1px solid ${border}`, paddingTop:16, display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:`${user.color}22`, border:`2px solid ${user.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:user.color, flexShrink:0 }}>{user.avatar}</div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.name.split(" ").slice(0,2).join(" ")}</div>
              <div style={{ fontSize:10, color:muted }}>{user.year}</div>
            </div>
          </div>
        </aside>
      )}

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex:1, marginLeft: isMobile?0:SIDEBAR_W, paddingBottom: isMobile?80:0, overflowY:"auto", minHeight:"100vh", position:"relative", zIndex:1, ...(isMobile?{}:{ display:"flex", justifyContent:"center" }) }}>
        <div style={{ width:"100%", maxWidth: isMobile?"100%":860 }}>
          {/* Mobile header */}
          {isMobile && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px 0" }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800 }} className="glow-text">ZIMAMOTO</div>
              <div className="puter-badge">
                {puterReady ? <><span style={{ fontSize:8 }}>●</span> AI Ready</> : <><div className="spinner" /> Loading</>}
              </div>
            </div>
          )}
          {page==="home"     && <StudyAI user={user} dark={dark} isMobile={isMobile} puterReady={puterReady} />}
          {page==="discuss"  && <DiscussPage user={user} dark={dark} isMobile={isMobile} puterReady={puterReady} />}
          {page==="blog"     && <BlogPage user={user} dark={dark} major={blogMajor} onChangeMajor={()=>setShowMajorPicker(true)} isMobile={isMobile} />}
          {page==="advice"   && <AdvicePage user={user} dark={dark} isMobile={isMobile} puterReady={puterReady} />}
          {page==="settings" && <SettingsPage user={user} setUser={setUser} dark={dark} isMobile={isMobile} />}
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      {isMobile && (
        <div style={{ position:"fixed", bottom:0, left:0, right:0, background: dark?"rgba(8,12,20,0.96)":"rgba(240,244,255,0.96)", borderTop:`1px solid ${border}`, display:"flex", justifyContent:"space-around", padding:"8px 4px", backdropFilter:"blur(16px)", zIndex:50 }}>
          {navItems.map(item => (
            <button key={item.id} className={`nav-bottom ${page===item.id?"active":""}`} onClick={() => handleNav(item.id)}>
              <span style={{ fontSize:20 }}>{item.icon}</span>
              <span style={{ fontSize:10, fontWeight: page===item.id?700:400, color: page===item.id?"#0072FF":(dark?"#4A6080":"#8898B0") }}>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Major Picker Modal */}
      {showMajorPicker && (
        <div className="modal-overlay" onClick={() => setShowMajorPicker(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, marginBottom:6 }}>Choose Your Field</div>
            <p style={{ fontSize:13, color:muted, marginBottom:20 }}>Select your academic field to see the most relevant content</p>
            <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr 1fr":"1fr 1fr 1fr", gap:10 }}>
              {MAJORS.map(m => (
                <button key={m.id} onClick={() => { setBlogMajor(m.id); setShowMajorPicker(false); setPage("blog"); }}
                  style={{ background:`${m.color}15`, border:`1.5px solid ${m.color}40`, borderRadius:12, padding:"12px 10px", cursor:"pointer", textAlign:"left", transition:"all 0.2s", outline:"none" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor=m.color; e.currentTarget.style.background=`${m.color}28`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=`${m.color}40`; e.currentTarget.style.background=`${m.color}15`; }}>
                  <div style={{ fontSize:22, marginBottom:5 }}>{m.icon}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:m.color, lineHeight:1.3 }}>{m.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STREAMING DOTS ───────────────────────────────────────────────────────────
function StreamDots() {
  return (
    <span className="dots-stream">
      {[0,1,2].map(i => <span key={i} className="dot" style={{ animation:`pulse 1.2s ease ${i*0.22}s infinite` }} />)}
    </span>
  );
}

function MarkdownText({ text, isUser = false }) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^---+$/.test(line.trim())) { i++; continue; }
    if (/^#{1,2}\s/.test(line)) {
      const level = line.match(/^#+/)[0].length;
      elements.push(<div key={i} style={{ fontWeight:800, fontSize: level===1?16:14, marginTop:12, marginBottom:5, color: isUser?"white":"#0072FF", fontFamily:"'Syne',sans-serif" }}>{renderInline(line.replace(/^#+\s*/,""), isUser)}</div>);
      i++; continue;
    }
    if (/^###\s/.test(line)) {
      elements.push(<div key={i} style={{ fontWeight:700, fontSize:13, marginTop:8, marginBottom:4, color: isUser?"rgba(255,255,255,0.9)":"inherit" }}>{renderInline(line.replace(/^#+\s*/,""), isUser)}</div>);
      i++; continue;
    }
    if (/^[-*]\s/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^[-*]\s/,"")); i++; }
      elements.push(<ul key={`ul${i}`} style={{ margin:"6px 0", padding:0, listStyle:"none" }}>{items.map((item,j)=><li key={j} style={{ display:"flex", gap:8, marginBottom:4, fontSize:14, lineHeight:1.6 }}><span style={{ color: isUser?"rgba(255,255,255,0.7)":"#0072FF", flexShrink:0 }}>•</span><span>{renderInline(item,isUser)}</span></li>)}</ul>);
      continue;
    }
    if (/^\d+\.\s/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+\.\s/,"")); i++; }
      elements.push(<ol key={`ol${i}`} style={{ margin:"6px 0", padding:0, listStyle:"none" }}>{items.map((item,j)=><li key={j} style={{ display:"flex", gap:8, marginBottom:5, fontSize:14, lineHeight:1.6 }}><span style={{ minWidth:22, height:22, borderRadius:"50%", background: isUser?"rgba(255,255,255,0.2)":"rgba(0,114,255,0.15)", color: isUser?"white":"#0072FF", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0 }}>{j+1}</span><span>{renderInline(item,isUser)}</span></li>)}</ol>);
      continue;
    }
    if (line.trim()==="") { elements.push(<div key={i} style={{ height:6 }} />); i++; continue; }
    elements.push(<div key={i} style={{ fontSize:14, lineHeight:1.7, marginBottom:2 }}>{renderInline(line,isUser)}</div>);
    i++;
  }
  return <div style={{ display:"flex", flexDirection:"column", gap:1 }}>{elements}</div>;
}

function renderInline(text, isUser=false) {
  if (!text) return null;
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((part,i)=>{
    if (/^\*\*(.+)\*\*$/.test(part)) return <strong key={i} style={{ fontWeight:700 }}>{part.slice(2,-2)}</strong>;
    if (/^\*(.+)\*$/.test(part)) return <em key={i} style={{ fontStyle:"italic", opacity:0.9 }}>{part.slice(1,-1)}</em>;
    if (/^`(.+)`$/.test(part)) return <code key={i} style={{ background: isUser?"rgba(255,255,255,0.2)":"rgba(0,114,255,0.1)", color: isUser?"white":"#06B6D4", padding:"1px 6px", borderRadius:4, fontSize:12, fontFamily:"monospace" }}>{part.slice(1,-1)}</code>;
    return part;
  });
}


// ─── STUDY AI ─────────────────────────────────────────────────────────────────
function StudyAI({ user, dark, isMobile, puterReady }) {
  const [file, setFile] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [stage, setStage] = useState("upload");
  const [summary, setSummary] = useState("");
  const [questions, setQuestions] = useState([]);
  const [activeResult, setActiveResult] = useState("summary");
  const [dragOver, setDragOver] = useState(false);
  const [streamPreview, setStreamPreview] = useState("");
  const fileRef = useRef();
  const bg = dark?"#0D1525":"#fff";
  const border = dark?"#1E2D4A":"#DDE5F5";
  const muted = dark?"#4A6080":"#7A8EB0";
  const pad = isMobile?"16px":"32px 40px";
  // ADD these 3 lines after your existing useState declarations
const [studyHistory, setStudyHistory] = useState([]);
const [showStudyHistory, setShowStudyHistory] = useState(false);

  const handleFile = async (f) => {
    if (!f) return;
    const ok = f.name.endsWith(".pdf")||f.name.endsWith(".docx")||f.name.endsWith(".pptx");
    if (!ok) { alert("Please upload PDF, DOCX, or PPTX."); return; }
    setFile(f); setStage("upload"); setSummary(""); setQuestions([]); setExtractedText("");
    if (f.name.endsWith(".docx")) {
      try { const buf = await readAsArrayBuffer(f); const res = await mammoth.extractRawText({ arrayBuffer:buf }); setExtractedText(res.value); } catch {}
    }
  };

  const process = async () => {
    if (!file||!puterReady) return;
    setStage("processing"); setStreamPreview("");
    try {
    const SYSTEM = `You are ZIMAMOTO AI — a smart study assistant for African university students. Analyze the academic material. Respond ONLY with valid JSON (no markdown fences): {"summary":"Structured takeaway with bullet points using • character. 300-500 words.","questions":[{"q":"question text","type":"MCQ|Short Answer|Essay|True/False","difficulty":"Easy|Medium|Hard","hint":"brief hint"}]} Generate exactly 12 questions mixing types and difficulties.`;
      let messages;
     if (file.name.endsWith(".pdf")) {
        // Puter.js does not support PDF binary — send filename + ask AI to generate
        messages = [{ role:"user", content:`Generate a detailed study summary and exam questions for a university-level PDF document titled: "${file.name}". Assume it is a typical African university academic document on that subject. Return the JSON.` }];
      
      
      } else if (file.name.endsWith(".docx") && extractedText) {
        messages = [{ role:"user", content:`Analyze this academic document:\n\n${extractedText.slice(0,8000)}\n\nReturn the JSON.` }];
      } else {
        messages = [{ role:"user", content:`Generate study summary and exam questions for a university-level document titled: "${file.name}". Return the JSON.` }];
      }
    let raw = "";
    await callAIStream(messages, SYSTEM, (partial) => { setStreamPreview(partial); raw = partial; }, 4000);
    const clean = raw.replace(/```json|```/g,"").trim();
      console.log("RAW AI RESPONSE:", clean.slice(0, 500));
      if (!clean || clean.length < 10) throw new Error("AI returned empty response. Check Puter.js is loaded and try again.");
      const jsonStart = clean.indexOf("{");
      const jsonEnd = clean.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) throw new Error(`AI did not return JSON. Got: "${clean.slice(0,120)}..."`);
      const parsed = JSON.parse(clean.slice(jsonStart, jsonEnd + 1));
      setSummary(parsed.summary||""); setQuestions(parsed.questions||[]); setStage("results");
    } catch(e) { alert("Error: "+e.message); setStage("upload"); }
  };

  const diffColor = { Easy:"#10B981", Medium:"#F59E0B", Hard:"#EF4444" };
  const typeColor = { MCQ:"#3B82F6", "Short Answer":"#8B5CF6", Essay:"#F97316", "True/False":"#06B6D4" };

  return (
    <div style={{ padding:pad }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
        <div style={{ width:46, height:46, background:"linear-gradient(135deg,#00C6FF,#0072FF)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🔥</div>
        <div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:isMobile?22:28, fontWeight:800 }} className="glow-text">ZIMAMOTO AI</div>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
            <div style={{ fontSize:12, color:muted }}>Your AI Study Buddy</div>
          </div>
        </div>
      </div>
      <p style={{ fontSize:13, color:muted, marginBottom:22, lineHeight:1.6 }}>Upload your notes or textbook — get instant summaries &amp; predicted exam questions</p>

      {stage==="upload" && (
        <div className="fade-up">
          <div className="upload-zone" style={dragOver?{borderColor:"#0072FF",background:"rgba(0,114,255,0.1)"}: {}}
            onClick={() => fileRef.current.click()}
            onDragOver={e=>{e.preventDefault();setDragOver(true);}}
            onDragLeave={()=>setDragOver(false)}
            onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);}}>
            <div style={{ fontSize:52, marginBottom:14 }}>📂</div>
            <div style={{ fontWeight:700, fontSize:16, color:"#ed9b96", marginBottom:6 }}>Drop your file here</div>
            <div style={{ fontSize:12, color:muted, marginBottom:18 }}>Notes, textbook chapters, lecture slides</div>
            <div style={{ display:"flex", justifyContent:"center", gap:8 }}>
              {[".PDF",".DOCX",".PPTX"].map(t=><span key={t} style={{ background:"rgba(0,114,255,0.15)", color:"#fbfbfb", padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700 }}>{t}</span>)}
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.pptx" style={{ display:"none" }} onChange={e=>handleFile(e.target.files[0])} />

          {file && (
            <div className="fade-up" style={{ marginTop:16, background:bg, border:`1px solid ${border}`, borderRadius:14, padding:16, display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:46, height:46, background:"linear-gradient(135deg,rgba(0,114,255,0.15),rgba(124,58,237,0.15))", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>
                {file.name.endsWith(".pdf")?"📄":file.name.endsWith(".docx")?"📝":"📊"}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{file.name}</div>
                <div style={{ fontSize:11, color:muted }}>{(file.size/1024).toFixed(0)} KB · Ready</div>
              </div>
              <button className="z-btn z-btn-primary" style={{ padding:"10px 18px", fontSize:13, flexShrink:0 }} disabled={!puterReady} onClick={process}>
                {puterReady?"Analyze ⚡":"Loading..."}
              </button>
            </div>
          )}

          <div style={{ marginTop:28 }}>
            <div style={{ fontSize:11, fontWeight:700, color:muted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14 }}>What you'll get</div>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)", gap:12 }}>
              {[{icon:"📋",title:"Smart Summary",desc:"Key concepts"},{icon:"❓",title:"Exam Questions",desc:"12 questions"},{icon:"🎯",title:"Difficulty Tags",desc:"Easy·Medium·Hard"},{icon:"💡",title:"Hints",desc:"Per question"}].map(f=>(
                <div key={f.title} style={{ background:bg, border:`1px solid ${border}`, borderRadius:12, padding:14 }}>
                  <div style={{ fontSize:22, marginBottom:8 }}>{f.icon}</div>
                  <div style={{ fontWeight:700, fontSize:13, marginBottom:4 }}>{f.title}</div>
                  <div style={{ fontSize:11, color:muted }}>{f.desc}</div>
                </div>
                
              ))}
            </div>
          </div>
        </div>
      )}

        {/* ── PAST ANALYSES HISTORY ── */}
<div style={{ marginTop:24 }}>
  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
    <div style={{ fontSize:11, fontWeight:700, color:muted, textTransform:"uppercase", letterSpacing:"0.08em" }}>
      Past Analyses
    </div>
    <button
      onClick={async () => {
        try {
          const raw = await window.puter.kv.get("zimamoto_study_history");
          setStudyHistory(raw ? JSON.parse(raw) : []);
        } catch { setStudyHistory([]); }
        setShowStudyHistory(h => !h);
      }}
      style={{ background:"rgba(0,114,255,0.1)", border:"1px solid rgba(0,114,255,0.25)", borderRadius:8, padding:"5px 12px", fontSize:11, color:"#0072FF", cursor:"pointer", fontWeight:600 }}>
      🕒 History
    </button>
  </div>

  {showStudyHistory && (
    <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:14, overflow:"hidden" }}>
      {studyHistory.length === 0
        ? <div style={{ padding:"20px 16px", textAlign:"center", color:muted, fontSize:13 }}>No past analyses yet. Upload a file to get started.</div>
        : studyHistory.map(item => (
          <div key={item.id}
            onClick={() => { setSummary(item.summary); setQuestions(item.questions); setStage("results"); setShowStudyHistory(false); }}
            
            style={{ padding:"12px 16px", borderBottom:`1px solid ${border}`, cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(0,114,255,0.06)"}
            onMouseLeave={e => e.currentTarget.style.background="transparent"}>
            <div style={{ fontSize:22, flexShrink:0 }}>
              {item.fileName.endsWith(".pdf") ? "📄" : item.fileName.endsWith(".docx") ? "📝" : "📊"}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:600, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.fileName}</div>
              <div style={{ fontSize:11, color:muted, marginTop:2 }}>{item.date} · {item.questions.length} questions</div>
            </div>
            <span style={{ fontSize:11, color:"#0072FF", fontWeight:700, flexShrink:0 }}>Reopen →</span>
          </div>
        ))
      }
    </div>
  )}
</div>

      {stage==="processing" && (
        <div className="fade-up" style={{ textAlign:"center", padding:"40px 20px" }}>
          <div style={{ fontSize:58, marginBottom:16 }}>🧠</div>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, marginBottom:6 }} className="glow-text">Analyzing....</div>
          <div style={{ fontSize:12, color:muted, marginBottom:20 }}>powered  by claude-sonnet-4-6  </div>
          <div style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:24 }}>
            {[0,1,2,3].map(i=><div key={i} style={{ width:9, height:9, borderRadius:"50%", background:"#0072FF", animation:`pulse 1.4s ease-in-out ${i*0.22}s infinite` }} />)}
          </div>
          {streamPreview && (
            <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:14, padding:16, textAlign:"left", maxHeight:160, overflowY:"auto" }}>
              <div style={{ fontSize:11, color:"#10B981", fontWeight:700, marginBottom:6 }}>⚡ Streaming response...</div>
              <div style={{ fontSize:11, color:muted, fontFamily:"monospace", whiteSpace:"pre-wrap", lineHeight:1.5 }}>{streamPreview.slice(0,400)}{streamPreview.length>400?"...":""}</div>
            </div>
          )}
        </div>
      )}

      {stage==="results" && (
        <div className="fade-up">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20 }}>Your Study Pack</div>
            <button onClick={()=>{setStage("upload");setFile(null);}} style={{ background:"none", border:`1px solid ${border}`, borderRadius:8, padding:"5px 14px", color:muted, cursor:"pointer", fontSize:12 }}>+ New File</button>
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:20 }}>
            {["summary","questions"].map(tab=>(
              <button key={tab} className="z-btn" onClick={()=>setActiveResult(tab)}
                style={{ flex:1, padding:"12px", fontSize:13, background: activeResult===tab?"linear-gradient(135deg,#00C6FF,#0072FF)":bg, color: activeResult===tab?"white":muted, border:`1px solid ${border}` }}>
                {tab==="summary"?"📋 Summary":`❓ Questions (${questions.length})`}
              </button>
            ))}
          </div>
          {activeResult==="summary" && (
            <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:16, padding:22 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}><span style={{ fontSize:18 }}>📋</span><span style={{ fontWeight:700, fontSize:16 }}>Takeaway Summary</span></div>
              <div style={{ fontSize:14, lineHeight:1.9, color: dark?"#CBD5E1":"#374151", whiteSpace:"pre-wrap" }}>{summary}</div>
            </div>
          )}
          {activeResult==="questions" && (
            <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:12 }}>
              {questions.map((q,i)=>(
                <div key={i} style={{ background:bg, border:`1px solid ${border}`, borderRadius:14, padding:16 }}>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
                    <span className="tag" style={{ background:`${typeColor[q.type]||"#3B82F6"}20`, color:typeColor[q.type]||"#3B82F6" }}>{q.type}</span>
                    <span className="tag" style={{ background:`${diffColor[q.difficulty]||"#F59E0B"}20`, color:diffColor[q.difficulty]||"#F59E0B" }}>{q.difficulty}</span>
                    <span style={{ marginLeft:"auto", fontWeight:700, fontSize:12, color:muted }}>Q{i+1}</span>
                  </div>
                  <div style={{ fontWeight:600, fontSize:14, marginBottom:8, lineHeight:1.5 }}>{q.q}</div>
                  {q.hint && <div style={{ fontSize:12, color:muted, fontStyle:"italic", borderTop:`1px solid ${border}`, paddingTop:8 }}>💡 {q.hint}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DISCUSS PAGE ─────────────────────────────────────────────────────────────
function DiscussPage({ user, dark, isMobile, puterReady }) {
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([
    { id:1, sender:"Amina J.", avatar:"AJ", color:"#F59E0B", text:"Hey everyone! Let's start with integration by substitution.", time:"10:32", isAI:false },
    { id:2, sender:"ZIMAMOTO AI", avatar:"ZI", color:"#0072FF", text:"Great topic! Integration by substitution works by replacing a complex expression with a simpler variable u. Steps: 1) Choose u wisely, 2) Compute du/dx, 3) Substitute both, 4) Integrate, 5) Back-substitute.", time:"10:32", isAI:true },
    { id:3, sender:"Brian O.", avatar:"BO", color:"#10B981", text:"Can someone explain when to use substitution vs integration by parts?", time:"10:35", isAI:false },
  ]);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("all");
  const messagesEndRef = useRef();
  const bg = dark?"#0D1525":"#fff";
  const border = dark?"#1E2D4A":"#DDE5F5";
  const muted = dark?"#4A6080":"#7A8EB0";
  const pad = isMobile?"16px":"32px 40px";

  useEffect(()=>{ messagesEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);

  const sendMsg = async () => {
    if (!input.trim()||!puterReady) return;
    const text = input;
    const now = new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
    setMessages(prev=>[...prev,{ id:Date.now(), sender:user.name, avatar:user.avatar, color:user.color, text, time:now, isAI:false }]);
    setInput("");
    const isQuery = text.includes("?")||/explain|what|how|why|define|describe/i.test(text);
    if (isQuery) {
      const aiId = Date.now()+1;
      setMessages(prev=>[...prev,{ id:aiId, sender:"ZIMAMOTO AI", avatar:"ZI", color:"#0072FF", text:"", time:now, isAI:true, streaming:true }]);
      try {
        const ctx = messages.slice(-5).map(m=>`${m.sender}: ${m.text}`).join("\n");
        await callAIStream(
          [{ role:"user", content:`Context:\n${ctx}\n\nStudent: ${text}` }],
          "You are ZIMAMOTO AI in a student discussion room. Give concise academic answers. 2-3 sentences max. Use markdown: **bold** for key terms, ## for headers, - for bullets, 1. for steps. Never use --- dividers.",
          (partial)=>{ setMessages(prev=>prev.map(m=>m.id===aiId?{...m,text:partial}:m)); },
          600
        );
        setMessages(prev=>prev.map(m=>m.id===aiId?{...m,streaming:false}:m));
      } catch {}
    }
  };

  const filteredRooms = filter==="all"?DISCUSSION_ROOMS:DISCUSSION_ROOMS.filter(r=>r.major===filter);

  if (activeRoom) {
    const room = DISCUSSION_ROOMS.find(r=>r.id===activeRoom);
    return (
      <div style={{ display:"flex", flexDirection:"column", height: isMobile?"calc(100vh - 65px)":"100vh" }}>
        <div style={{ padding:"14px 20px", background: dark?"#080C14":"#F0F4FF", borderBottom:`1px solid ${border}`, display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={()=>setActiveRoom(null)} style={{ background:"none", border:"none", color:muted, cursor:"pointer", fontSize:22 }}>←</button>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:16 }}>{room.subject}</div>
            <div style={{ fontSize:11, color:muted }}>{room.topic}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"#10B981", animation:"pulse 2s infinite" }} />
            <span style={{ fontSize:11, color:"#10B981", fontWeight:700 }}>LIVE</span>
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>
          {messages.map(msg=>(
            <div key={msg.id} style={{ display:"flex", gap:10, flexDirection: msg.sender===user.name?"row-reverse":"row" }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background: msg.isAI?"linear-gradient(135deg,#00C6FF,#0072FF)":`${msg.color}22`, border:`2px solid ${msg.color}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color: msg.isAI?"white":msg.color, flexShrink:0 }}>{msg.avatar}</div>
              <div style={{ maxWidth: isMobile?"76%":"60%" }}>
                <div style={{ fontSize:11, color:muted, marginBottom:3, textAlign: msg.sender===user.name?"right":"left" }}>
                  {msg.isAI?<span style={{ color:"#E25822", fontWeight:700 }}>⚡ ZIMAMOTO AI</span>:msg.sender} · {msg.time}
                </div>
                <div style={{ background: msg.sender===user.name?"linear-gradient(135deg,#00C6FF,#0072FF)":(msg.isAI?"rgba(0,114,255,0.1)":bg), border: msg.sender===user.name?"none":`1px solid ${msg.isAI?"rgba(0,114,255,0.3)":border}`, borderRadius: msg.sender===user.name?"14px 4px 14px 14px":"4px 14px 14px 14px", padding:"10px 14px", color: msg.sender===user.name?"white":(dark?"#CBD5E1":"#374151"), minHeight:40 }}>
  {msg.text ? <MarkdownText text={msg.text} isUser={msg.sender===user.name} /> : (msg.streaming && <StreamDots />)}
</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div style={{ padding:"12px 20px", background: dark?"#080C14":"#F0F4FF", borderTop:`1px solid ${border}`, display:"flex", gap:8 }}>
          <input className="z-input" style={!dark?{background:"#F7F9FF",color:"#1a1f2e",border:"1px solid #DDE5F5"}:{}} placeholder={puterReady?"Ask a question (AI responds automatically)...":"Loading AI..."} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()} />
          <button className="z-btn z-btn-primary" style={{ padding:"11px 18px", borderRadius:10, flexShrink:0 }} disabled={!puterReady} onClick={sendMsg}>↑</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding:pad }}>
      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:isMobile?22:28, fontWeight:800, marginBottom:4 }}>Discussion Rooms</div>
      <p style={{ fontSize:13, color:muted, marginBottom:18 }}>Join a live study session. ZIMAMOTO AI assists in every room.</p>
      <div style={{ display:"flex", gap:8, overflowX:"auto", marginBottom:20, paddingBottom:4 }}>
        {[{id:"all",label:"All",icon:""},...MAJORS.slice(0,7)].map(m=>(
          <button key={m.id} className="pill-btn" onClick={()=>setFilter(m.id)}
            style={{ background: filter===m.id?"linear-gradient(135deg,#00C6FF,#0072FF)":bg, borderColor: filter===m.id?"transparent":border, color: filter===m.id?"white":muted }}>
            {m.icon?`${m.icon} `:""}{m.label||"All"}
          </button>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:12 }}>
        {filteredRooms.map((room,i)=>{
          const mi = MAJORS.find(m=>m.id===room.major);
          return (
            <div key={room.id} className="fade-up" style={{ background:bg, border:`1px solid ${border}`, borderRadius:14, padding:16, cursor:"pointer", transition:"all 0.2s", animationDelay:`${i*0.06}s` }}
              onClick={()=>setActiveRoom(room.id)}
              onMouseEnter={e=>e.currentTarget.style.borderColor="#0072FF55"}
              onMouseLeave={e=>e.currentTarget.style.borderColor=border}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                <div style={{ width:46, height:46, borderRadius:12, background:`${mi?.color||"#3B82F6"}15`, border:`1.5px solid ${mi?.color||"#3B82F6"}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{mi?.icon||"📚"}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <span style={{ fontWeight:700, fontSize:15 }}>{room.subject}</span>
                    {room.active&&<><div style={{ width:6, height:6, borderRadius:"50%", background:"#10B981", animation:"pulse 2s infinite" }}/><span style={{ fontSize:10, color:"#10B981", fontWeight:700 }}>ONLINE</span></>}
                  </div>
                  <div style={{ fontSize:12, color:muted, marginBottom:10 }}>{room.topic}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:14, fontSize:12, color:muted }}>
                    <span>👥 {room.members}</span><span>💬 {room.msgs}</span>
                    <span style={{ color:"#0072FF", fontWeight:700, marginLeft:"auto" }}>Join →</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── BLOG PAGE ────────────────────────────────────────────────────────────────
function BlogPage({ user, dark, major, onChangeMajor, isMobile }) {
  const [filter, setFilter] = useState("all");
  const [activePost, setActivePost] = useState(null);
  const bg = dark?"#0D1525":"#fff";
  const border = dark?"#1E2D4A":"#DDE5F5";
  const muted = dark?"#4A6080":"#7A8EB0";
  const pad = isMobile?"16px":"32px 40px";
  const mi = MAJORS.find(m=>m.id===major);
  const majorPosts = BLOG_POSTS[major]||[];
  const otherPosts = Object.values(BLOG_POSTS).flat().filter(p=>!majorPosts.find(mp=>mp.id===p.id)).slice(0,4);
  const allPosts = [...majorPosts,...otherPosts];
  const posts = filter==="all"?allPosts:allPosts.filter(p=>p.type===filter);
  const TC = { pastpaper:{label:"Past Paper",color:"#EF4444",icon:"📋"}, material:{label:"Material",color:"#3B82F6",icon:"📚"}, tip:{label:"Study Tip",color:"#10B981",icon:"💡"} };

  if (activePost) {
    const tc = TC[activePost.type];
    return (
      <div style={{ padding:pad }} className="fade-up">
        <button onClick={()=>setActivePost(null)} style={{ background:"none", border:"none", color:muted, cursor:"pointer", fontSize:14, marginBottom:20 }}>← Back</button>
        <span className="tag" style={{ background:`${tc.color}20`, color:tc.color, marginBottom:12, display:"inline-block" }}>{tc.icon} {tc.label}</span>
        <h1 style={{ fontFamily:"sans-serif", fontSize:isMobile?20:26, fontWeight:800, lineHeight:1.3, marginBottom:14, marginTop:8 }}>{activePost.title}</h1>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20, color:muted, fontSize:12 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#00C6FF,#0072FF)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"white" }}>{activePost.author.split(" ").map(w=>w[0]).join("").slice(0,2)}</div>
          <span style={{ fontWeight:600 }}>{activePost.author}</span><span>·</span><span>{activePost.date}</span>
          <span style={{ marginLeft:"auto" }}>❤️ {activePost.likes}</span>
        </div>
        <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:16, padding:22, fontSize:14, lineHeight:1.9, color: dark?"#CBD5E1":"#374151", whiteSpace:"pre-wrap" }}>{activePost.summary}</div>
      </div>
    );
  }

  return (
    <div style={{ padding:pad }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
        <div style={{ fontFamily:"sans-serif", fontSize:isMobile?22:28, fontWeight:800 }}>Blog</div>
        <button onClick={onChangeMajor} style={{ background:`${mi?.color}15`, border:`1px solid ${mi?.color}40`, borderRadius:20, padding:"6px 14px", fontSize:11, fontWeight:700, color:mi?.color, cursor:"pointer" }}>{mi?.icon} {mi?.label}</button>
      </div>
      <p style={{ fontSize:13, color:muted, marginBottom:18 }}>Past papers, materials &amp; study tips from your peers</p>
      <div style={{ display:"flex", gap:8, overflowX:"auto", marginBottom:20, paddingBottom:4 }}>
        {[{id:"all",label:"All"},{id:"pastpaper",label:"📋 Past Papers"},{id:"material",label:"📚 Materials"},{id:"tip",label:"💡 Tips"}].map(f=>(
          <button key={f.id} className="pill-btn" onClick={()=>setFilter(f.id)} style={{ background: filter===f.id?"linear-gradient(135deg,#00C6FF,#0072FF)":bg, borderColor: filter===f.id?"transparent":border, color: filter===f.id?"white":muted }}>{f.label}</button>
        ))}
      </div>
      {posts.length===0 ? (
        <div style={{ textAlign:"center", padding:"60px 20px", color:muted }}>
          <div style={{ fontSize:52, marginBottom:12 }}>📭</div>
          <div style={{ fontWeight:700, fontSize:16 }}>No posts yet for {mi?.label}</div>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:14 }}>
          {posts.map((post,i)=>{
            const tc = TC[post.type];
            return (
              <div key={post.id} className="fade-up" style={{ background:bg, border:`1px solid ${border}`, borderRadius:14, padding:18, cursor:"pointer", transition:"all 0.2s", animationDelay:`${i*0.06}s` }}
                onClick={()=>setActivePost(post)}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor="#0072FF44";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.borderColor=border;}}>
                <span className="tag" style={{ background:`${tc.color}18`, color:tc.color, marginBottom:10, display:"inline-block" }}>{tc.icon} {tc.label}</span>
                <div style={{ fontWeight:700, fontSize:14, lineHeight:1.4, marginBottom:8 }}>{post.title}</div>
                <div style={{ fontSize:12, color:muted, lineHeight:1.5, marginBottom:10 }}>{post.summary.slice(0,100)}...</div>
                <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:muted }}>
                  <span>👤 {post.author}</span><span>·</span><span>{post.date}</span>
                  <span style={{ marginLeft:"auto" }}>❤️ {post.likes}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ADVICE PAGE ─────────────────────────────────────────────────────────────
function AdvicePage({ user, dark, isMobile, puterReady }) {
  const [view, setView] = useState("feed");
  const [activePost, setActivePost] = useState(null);
  const [aiInput, setAiInput] = useState("");
const [aiMessages, setAiMessages] = useState([
  { role:"assistant", text:"Habari! Mimi ni ZIMAMOTO AI . Niko hapa kukusaidia! Niulize chochote kuhusu masomo, GPA, au career. 🎓" }
]);
const [aiStreaming, setAiStreaming] = useState(false);
const [historyList, setHistoryList] = useState([]);
const [showHistory, setShowHistory] = useState(false);
const [currentSessionId, setCurrentSessionId] = useState(null);
  const aiEndRef = useRef();
  const bg = dark?"#0D1525":"#fff";
  const border = dark?"#1E2D4A":"#DDE5F5";
  const muted = dark?"#4A6080":"#7A8EB0";
  const catColor = { Academic:"#0072FF","Life Skills":"#10B981",Wellness:"#EC4899",Career:"#F59E0B" };
  const pad = isMobile?"16px":"32px 40px";

// Load all saved sessions from Puter KV
const loadHistory = async () => {
  try {
    const raw = await window.puter.kv.get("zimamoto_chat_history");
    if (raw) setHistoryList(JSON.parse(raw));
  } catch { setHistoryList([]); }
};

// Save current chat as a session
const saveSession = async (msgs, sessionId) => {
  if (msgs.length < 2) return; // don't save empty chats
  try {
    const raw = await window.puter.kv.get("zimamoto_chat_history");
    const existing = raw ? JSON.parse(raw) : [];
    const firstUserMsg = msgs.find(m => m.role === "user");
    const title = firstUserMsg ? firstUserMsg.text.slice(0, 50) : "Chat Session";
    const updated = [
      { id: sessionId, title, date: new Date().toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" }), messages: msgs },
      ...existing.filter(s => s.id !== sessionId)
    ].slice(0, 20); // keep max 20 sessions
    await window.puter.kv.set("zimamoto_chat_history", JSON.stringify(updated));
    setHistoryList(updated);
  } catch(e) { console.error("Save failed", e); }
};

// Start a fresh new chat
const startNewChat = () => {
  const newId = Date.now().toString();
  setCurrentSessionId(newId);
  setAiMessages([{ role:"assistant", text:"Habari! Mimi ni ZIMAMOTO AI. Niko hapa kukusaidia! Niulize chochote kuhusu masomo, GPA, au career. 🎓" }]);
  setShowHistory(false);
};

// Open a past session (read-only)
const openSession = (session) => {
  setAiMessages(session.messages);
  setCurrentSessionId(session.id);
  setShowHistory(false);
};

  useEffect(()=>{ aiEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [aiMessages]);
useEffect(()=>{ aiEndRef.current?.scrollIntoView({behavior:"smooth"}); }, [aiMessages]);

// Load history when Advice page opens and puter is ready
useEffect(() => {
  if (puterReady) { loadHistory(); setCurrentSessionId(Date.now().toString()); }
}, [puterReady]);
  const sendAi = async () => {
    if (!aiInput.trim()||!puterReady||aiStreaming) return;
    const text = aiInput;
    setAiMessages(prev=>[...prev,{role:"user",text}]);
    setAiInput(""); setAiStreaming(true);
    const aiId = Date.now();
    setAiMessages(prev=>[...prev,{role:"assistant",text:"",id:aiId,streaming:true}]);
    try {
      const hist = aiMessages.slice(-8).map(m=>({role:m.role==="user"?"user":"assistant",content:m.text}));
      await callAIStream(
        [...hist,{role:"user",content:text}],
        "You are ZIMAMOTO AI, a friendly academic advisor for East African university students. Give practical, culturally relevant advice. You can speak Swahili and English. Be warm, concise, actionable. Use markdown: **bold** for key terms, ## for headers, - for bullets, 1. for numbered steps. Never use --- dividers.",
        (partial)=>{ setAiMessages(prev=>prev.map(m=>m.id===aiId?{...m,text:partial}:m)); },
        900
      );
      setAiMessages(prev => {
        const updated = prev.map(m => m.id===aiId ? {...m, streaming:false} : m);
        saveSession(updated, currentSessionId); // ← auto-save here
        return updated;
      });
    } catch {}
    setAiStreaming(false);
  };

  if (activePost) {
    const cc = catColor[activePost.category]||"#0072FF";
    return (
      <div style={{ padding:pad }} className="fade-up">
        <button onClick={()=>setActivePost(null)} style={{ background:"none", border:"none", color:muted, cursor:"pointer", fontSize:14, marginBottom:20 }}>← Back</button>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
          <div style={{ width:48, height:48, borderRadius:"50%", background:`${activePost.color}22`, border:`2px solid ${activePost.color}66`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700, color:activePost.color }}>{activePost.avatar}</div>
          <div><div style={{ fontWeight:700 }}>{activePost.author}</div><div style={{ fontSize:12, color:muted }}>{activePost.date}</div></div>
          <span className="tag" style={{ marginLeft:"auto", background:`${cc}20`, color:cc }}>{activePost.category}</span>
        </div>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:isMobile?20:26, fontWeight:800, lineHeight:1.3, marginBottom:20 }}>{activePost.title}</h1>
        <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:16, padding:22, fontSize:14, lineHeight:1.9, color: dark?"#CBD5E1":"#374151", whiteSpace:"pre-wrap" }}>{activePost.content}</div>
      </div>
    );
  }

  return (
    <div style={{ padding:pad }}>
      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:isMobile?22:28, fontWeight:800, marginBottom:4 }}>Advice Room</div>
      <p style={{ fontSize:13, color:muted, marginBottom:18 }}>Peer advice or chat with ZIMAMOTO AI</p>
      <div style={{ display:"flex", gap:8, marginBottom:22 }}>
        {[{id:"feed",label:"📰 Blog Feed"},{id:"ai",label:"⚡ Ask AI"}].map(v=>(
          <button key={v.id} className="z-btn" onClick={()=>setView(v.id)}
            style={{ flex:1, padding:"12px", fontSize:13, background: view===v.id?"linear-gradient(135deg,#00C6FF,#0072FF)":bg, color: view===v.id?"white":muted, border:`1px solid ${border}` }}>
            {v.label}
          </button>
        ))}
      </div>

      {view==="feed" && (
        <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:14 }}>
          {ADVICE_POSTS.map((post,i)=>{
            const cc = catColor[post.category]||"#0072FF";
            return (
              <div key={post.id} className="fade-up" style={{ background:bg, border:`1px solid ${border}`, borderRadius:14, padding:18, cursor:"pointer", transition:"all 0.2s", animationDelay:`${i*0.06}s` }}
                onClick={()=>setActivePost(post)}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor="#0072FF44";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.borderColor=border;}}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:"50%", background:`${post.color}22`, border:`2px solid ${post.color}55`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:post.color, flexShrink:0 }}>{post.avatar}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", gap:6, marginBottom:6 }}>
                      <span className="tag" style={{ background:`${cc}18`, color:cc }}>{post.category}</span>
                      <span style={{ fontSize:11, color:muted, marginLeft:"auto" }}>{post.date}</span>
                    </div>
                    <div style={{ fontWeight:700, fontSize:14, lineHeight:1.4, marginBottom:6 }}>{post.title}</div>
                    <div style={{ display:"flex", gap:10, fontSize:12, color:muted }}>
                      <span>{post.author}</span><span style={{ marginLeft:"auto" }}>❤️ {post.likes}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view==="feed" && (
        <div>
  <div style={{ background:"rgba(0,114,255,0.06)", border:"1px solid rgba(0,114,255,0.2)", borderRadius:14, padding:14, marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
  <div style={{ flex:1 }}>
    <div style={{ fontSize:12, fontWeight:700, color:"#0072FF" }}>⚡ ZIMAMOTO AI</div>
  </div>
  <button onClick={() => setShowHistory(!showHistory)} style={{ background:"rgba(0,114,255,0.1)", border:"1px solid rgba(0,114,255,0.25)", borderRadius:8, padding:"5px 10px", fontSize:11, color:"#0072FF", cursor:"pointer", fontWeight:600, marginRight:6 }}>
    🕒 History
  </button>
  <button onClick={startNewChat} style={{ background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.3)", borderRadius:8, padding:"5px 10px", fontSize:11, color:"#10B981", cursor:"pointer", fontWeight:600, marginRight:6 }}>
    + New
  </button>
  <div className="puter-badge">
    {puterReady?<><span style={{ fontSize:8 }}>●</span> Ready</>:<><div className="spinner"/>Loading</>}
  </div>
</div>

{/* History Panel */}
{showHistory && (
  <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:14, marginBottom:16, overflow:"hidden" }}>
    <div style={{ padding:"12px 16px", borderBottom:`1px solid ${border}`, fontWeight:700, fontSize:13, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <span>🕒 Past Conversations</span>
      <button onClick={() => setShowHistory(false)} style={{ background:"none", border:"none", color:muted, cursor:"pointer", fontSize:18 }}>×</button>
    </div>
    {historyList.length === 0 ? (
      <div style={{ padding:"24px 16px", textAlign:"center", color:muted, fontSize:13 }}>No saved chats yet. Start chatting!</div>
    ) : (
      historyList.map(session => (
        <div key={session.id} onClick={() => openSession(session)}
          style={{ padding:"12px 16px", borderBottom:`1px solid ${border}`, cursor:"pointer", transition:"background 0.2s", display:"flex", alignItems:"center", gap:10 }}
          onMouseEnter={e => e.currentTarget.style.background="rgba(0,114,255,0.06)"}
          onMouseLeave={e => e.currentTarget.style.background="transparent"}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:600, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{session.title}</div>
            <div style={{ fontSize:11, color:muted, marginTop:2 }}>{session.date} · {session.messages.length} messages</div>
          </div>
          <span style={{ fontSize:11, color:"#0072FF", fontWeight:700, flexShrink:0 }}>Open →</span>
        </div>
      ))
    )}
  </div>
)}
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:16, maxHeight:isMobile?380:520, overflowY:"auto", padding:"4px 0" }}>
            {aiMessages.map((msg,i)=>(
              <div key={msg.id||i} style={{ display:"flex", gap:10, flexDirection: msg.role==="user"?"row-reverse":"row" }}>
                <div style={{ width:34, height:34, borderRadius:"50%", background: msg.role==="user"?`${user.color}22`:"linear-gradient(135deg,#00C6FF,#0072FF)", border: msg.role==="user"?`2px solid ${user.color}55`:"none", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color: msg.role==="user"?user.color:"white", flexShrink:0 }}>{msg.role==="user"?user.avatar:"ZI"}</div>
               <div style={{ maxWidth:isMobile?"82%":"70%", background: msg.role==="user"?"linear-gradient(135deg,#00C6FF,#0072FF)":bg, border: msg.role==="user"?"none":`1px solid ${border}`, borderRadius: msg.role==="user"?"14px 4px 14px 14px":"4px 14px 14px 14px", padding:"10px 14px", color: msg.role==="user"?"white":(dark?"#CBD5E1":"#374151"), minHeight:42 }}>
  {msg.text ? <MarkdownText text={msg.text} isUser={msg.role==="user"} /> : (msg.streaming && <StreamDots />)}
</div>
              </div>
            ))}
            <div ref={aiEndRef} />
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <input className="z-input" style={!dark?{background:"#F7F9FF",color:"#1a1f2e",border:"1px solid #DDE5F5"}:{}} placeholder={puterReady?"Niulize chochote / Ask me anything...":"Loading Puter.js..."} value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendAi()} />
            <button className="z-btn z-btn-primary" style={{ padding:"11px 18px", borderRadius:10, flexShrink:0 }} disabled={!puterReady||aiStreaming} onClick={sendAi}>↑</button>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {["Jinsi ya kuongeza GPA?","How to beat exam stress?","Best note-taking method?","Career planning tips"].map(q=>(
              <button key={q} onClick={()=>setAiInput(q)} style={{ background:"rgba(0,114,255,0.08)", border:"1px solid rgba(0,114,255,0.2)", borderRadius:20, padding:"5px 11px", fontSize:11, color:"#0072FF", cursor:"pointer" }}>{q}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
function SettingsPage({ user, setUser, dark, isMobile }) {
  const [saved, setSaved] = useState(false);
  const bg = dark?"#0D1525":"#fff";
  const border = dark?"#1E2D4A":"#DDE5F5";
  const muted = dark?"#4A6080":"#7A8EB0";
  const pad = isMobile?"16px":"32px 40px";
  const up = (k,v) => setUser(p=>({...p,[k]:v}));
  const save = () => { setSaved(true); setTimeout(()=>setSaved(false),2000); };

  return (
    <div style={{ padding:pad }}>
      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:isMobile?22:28, fontWeight:800, marginBottom:22 }}>Settings</div>

      <div style={{ background:"linear-gradient(135deg,rgba(0,114,255,0.12),rgba(124,58,237,0.08))", border:"1px solid rgba(0,114,255,0.22)", borderRadius:18, padding:20, marginBottom:20, display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:60, height:60, borderRadius:"50%", background:`${user.color}22`, border:`3px solid ${user.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:800, color:user.color }}>{user.avatar}</div>
        <div>
          <div style={{ fontWeight:800, fontSize:17 }}>{user.name}</div>
          <div style={{ fontSize:12, color:muted }}>{user.university}</div>
          <div style={{ fontSize:12, color:muted }}>{MAJORS.find(m=>m.id===user.major)?.label} · {user.year}</div>
        </div>
      </div>


      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 1fr", gap:20 }}>
        {[
          { section:"Profile", fields:[
            { label:"Full Name", el:<input className="z-input" style={!dark?{background:"#F7F9FF",color:"#1a1f2e",border:"1px solid #DDE5F5"}:{}} value={user.name} onChange={e=>up("name",e.target.value)} /> },
            { label:"University", el:<input className="z-input" style={!dark?{background:"#F7F9FF",color:"#1a1f2e",border:"1px solid #DDE5F5"}:{}} value={user.university} onChange={e=>up("university",e.target.value)} /> },
            { label:"Year of Study", el:<select className="z-input" style={!dark?{background:"#F7F9FF",color:"#1a1f2e",border:"1px solid #DDE5F5"}:{}} value={user.year} onChange={e=>up("year",e.target.value)}>{["1st Year","2nd Year","3rd Year","4th Year","Postgraduate"].map(y=><option key={y}>{y}</option>)}</select> },
            { label:"Major Field", el:<select className="z-input" style={!dark?{background:"#F7F9FF",color:"#1a1f2e",border:"1px solid #DDE5F5"}:{}} value={user.major} onChange={e=>up("major",e.target.value)}>{MAJORS.map(m=><option key={m.id} value={m.id}>{m.icon} {m.label}</option>)}</select> },
          ]},
          { section:"Appearance & Preferences", fields:[
            { label:"Theme", el:<div style={{ display:"flex", gap:8 }}>{["dark","light"].map(t=><button key={t} onClick={()=>up("theme",t)} style={{ flex:1, padding:"9px", borderRadius:10, border:`1.5px solid ${user.theme===t?"#0072FF":border}`, background:user.theme===t?"rgba(0,114,255,0.15)":"transparent", color:user.theme===t?"#0072FF":muted, cursor:"pointer", fontWeight:600, fontSize:13 }}>{t==="dark"?"🌙 Dark":"☀️ Light"}</button>)}</div> },
            { label:"Profile Colour", el:<div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>{AVATAR_COLORS.map(c=><button key={c} onClick={()=>up("color",c)} style={{ width:32, height:32, borderRadius:"50%", background:c, border:user.color===c?"3px solid white":"3px solid transparent", outline:user.color===c?`3px solid ${c}`:"none", cursor:"pointer" }} />)}</div> },
            { label:"Notifications", el:<div style={{ display:"flex", alignItems:"center" }}><span style={{ fontSize:13, color:muted }}>Discussion &amp; AI updates</span><div onClick={()=>up("notifications",!user.notifications)} style={{ marginLeft:"auto", width:46, height:26, borderRadius:13, background:user.notifications?"#0072FF":(dark?"#1E2D4A":"#DDE5F5"), cursor:"pointer", position:"relative", transition:"background 0.2s" }}><div style={{ position:"absolute", top:3, left:user.notifications?23:3, width:20, height:20, borderRadius:"50%", background:"white", transition:"left 0.2s" }} /></div></div> },
            { label:"Language", el:<select className="z-input" style={!dark?{background:"#F7F9FF",color:"#1a1f2e",border:"1px solid #DDE5F5"}:{}} value={user.lang} onChange={e=>up("lang",e.target.value)}><option value="en">US English</option><option value="sw">TZ Kiswahili</option></select> },
          ]},
        ].map(({section,fields})=>(
          <div key={section}>
            <div style={{ fontSize:11, fontWeight:700, color:"#0072FF", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>{section}</div>
            <div style={{ background:bg, border:`1px solid ${border}`, borderRadius:14, overflow:"hidden" }}>
              {fields.map((f,i)=>(
                <div key={f.label} style={{ padding:"14px 16px", borderBottom:i<fields.length-1?`1px solid ${border}`:"none" }}>
                  <div style={{ fontSize:12, color:muted, marginBottom:8, fontWeight:600 }}>{f.label}</div>
                  {f.el}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button className="z-btn z-btn-primary" onClick={save} style={{ width:"100%", padding:"14px", marginTop:24 }}>
        {saved?"✅ Changes Saved!":"Save Changes"}
      </button>

      <div style={{ textAlign:"center", marginTop:30, color:muted, fontSize:12 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16, marginBottom:4 }} className="glow-text">ZIMAMOTO AI</div>
        <div>©Mwasa Inc 2026 · Built for African Students</div>
        <div style={{ marginTop:4, opacity:0.6 }}>Version 1.0 · powered by Puter.js</div>
      </div>
      <Analytics />
    </div>
  );
}
