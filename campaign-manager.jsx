import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronDown, ChevronRight, Swords, Users, MapPin, Crown,
  Scroll, Clock, Star, BookOpen, Dice6,
  Target, Heart, CheckCircle, Circle, ArrowRight, Plus,
  Compass, Mountain, Castle, Skull, Flag, TrendingUp, TrendingDown, Minus,
  SkipForward, Search, Bell, Settings, X, Edit3, Trash2, Eye, EyeOff,
  Globe, Layers, Activity, Upload, Download, FileText, Save, Copy,
  Calendar, Lock, Unlock, ToggleLeft, ToggleRight, AlertTriangle,
  Package, Shield, Wand2, Map as MapIcon, Link, RefreshCw, ChevronUp,
  MoreVertical, Check, Image, Bold, Italic, List, Type, Heading
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   PHMURT STUDIOS — CAMPAIGN MANAGER
   Tokens & patterns matched 1:1 to style.css + campaigns.html
   ═══════════════════════════════════════════════════════════════════════════ */

/* Design tokens wired to CSS custom properties from style.css.
   Dark/light toggle is handled by html.light-mode — these vars
   resolve automatically so the campaign manager follows the site theme. */
const T = {
  bg:            "var(--bg)",
  bgNav:         "var(--bg-nav)",
  bgCard:        "var(--bg-card)",
  bgHover:       "var(--bg-hover)",
  bgMid:         "var(--bg-mid)",
  bgInput:       "var(--bg-input)",
  text:          "var(--text)",
  textDim:       "var(--text-dim)",
  textMuted:     "var(--text-muted)",
  textFaint:     "var(--text-faint)",
  crimson:       "var(--crimson)",
  crimsonDim:    "var(--crimson-dim)",
  crimsonSoft:   "var(--crimson-soft)",
  crimsonBorder: "var(--crimson-border)",
  border:        "var(--border)",
  borderMid:     "var(--border-mid)",
  ui:            "'Cinzel', serif",
  body:          "'Spectral', Georgia, serif",
};

/* Read a computed CSS variable value — needed for <canvas> fillStyle/strokeStyle
   which cannot interpret var() references. */
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// ─── BLANK CAMPAIGN TEMPLATE ────────────────────────────────────────────────

const NEW_CAMPAIGN = () => ({
  name: "Untitled Campaign", status: "active", startDate: new Date().toISOString().slice(0,10),
  nextSession: "", sessionsPlayed: 0,
  sessionSchedule: { dayOfWeek: 6, hour: 19, minute: 0, frequency: "weekly", timezone: "EST" },
  modules: {
    timeline: true, worldState: true, playMode: true, scheduler: true,
    questTracker: true, factionTracker: true, npcTracker: true,
    playerUploads: true, notesEditor: true,
  },
  party: [], quests: [], factions: [], regions: [], npcs: [],
  timeline: [], campaignNotes: [],
  activity: [{ time: "Just now", text: "Campaign created" }],
});

// ─── EXAMPLE CAMPAIGN (saved to account) ────────────────────────────────────

const EXAMPLE_CAMPAIGN = {
  name: "The Shattered Crown", status: "active", startDate: "2025-09-14",
  nextSession: "2026-04-02T19:00:00", sessionsPlayed: 24,
  sessionSchedule: { dayOfWeek: 3, hour: 19, minute: 0, frequency: "weekly", timezone: "EST" },
  modules: {
    timeline: true, worldState: true, playMode: true, scheduler: true,
    questTracker: true, factionTracker: true, npcTracker: true,
    playerUploads: true, notesEditor: true,
  },
  party: [
    { id:1, name:"Kael Stormwind",   cls:"Paladin", lv:9, hp:78, maxHp:85, ac:20, player:"Marcus", status:"healthy", sheetUrl:null, sheetName:null, race:"Human", bio:"Former soldier turned holy warrior." },
    { id:2, name:"Lyra Nightbloom",  cls:"Wizard",  lv:9, hp:42, maxHp:48, ac:15, player:"Sarah",  status:"healthy", sheetUrl:null, sheetName:null, race:"Half-Elf", bio:"Arcane scholar from the Moonspire Academy." },
    { id:3, name:"Thorne Ashwick",   cls:"Rogue",   lv:9, hp:55, maxHp:62, ac:17, player:"Jake",   status:"poisoned", sheetUrl:null, sheetName:null, race:"Halfling", bio:"Charming thief with a heart of gold." },
    { id:4, name:"Bronwyn Ironfist", cls:"Cleric",  lv:9, hp:68, maxHp:70, ac:18, player:"Emma",   status:"healthy", sheetUrl:null, sheetName:null, race:"Dwarf", bio:"Devoted healer and keeper of old rites." },
    { id:5, name:"Fenris Darkmoor",  cls:"Ranger",  lv:9, hp:30, maxHp:58, ac:16, player:"Alex",   status:"wounded", sheetUrl:null, sheetName:null, race:"Human", bio:"Lone tracker haunted by a dark past." },
  ],
  quests: [
    { id:1, title:"Retrieve the Crown of Aldenmire",  type:"main", status:"active", urgency:"high",     faction:"The Silver Accord", region:"Aldenmire Ruins" },
    { id:2, title:"Investigate the Blighted Marsh",    type:"side", status:"active", urgency:"medium",   faction:"Marsh Wardens",     region:"Greymoor Marshes" },
    { id:3, title:"Escort the Merchant Caravan",       type:"side", status:"completed", urgency:"low",   faction:"Merchant Guild",    region:"King's Road" },
    { id:4, title:"Destroy the Shadow Obelisk",        type:"main", status:"active", urgency:"critical", faction:"The Hollow",        region:"Shadowfen" },
    { id:5, title:"Win the Tournament of Blades",      type:"side", status:"upcoming", urgency:"low",    faction:"Kingdom of Valdris",region:"Valdris Capital" },
  ],
  factions: [
    { id:1, name:"The Silver Accord",  attitude:"allied",   power:72, trend:"rising",    desc:"Coalition of free cities opposing the Hollow",      color:"#94a3b8" },
    { id:2, name:"The Hollow",         attitude:"hostile",  power:88, trend:"rising",    desc:"Shadow cult seeking the Shattered Crown",            color:"#7c3aed" },
    { id:3, name:"Kingdom of Valdris", attitude:"neutral",  power:65, trend:"declining", desc:"Once-mighty kingdom weakened by civil war",          color:"#d97706" },
    { id:4, name:"Marsh Wardens",      attitude:"friendly", power:30, trend:"stable",   desc:"Druidic guardians of the Greymoor Marshes",          color:"#2d6a4f" },
    { id:5, name:"Merchant Guild",     attitude:"friendly", power:55, trend:"rising",    desc:"Trade consortium with vast information networks",    color:"#c0392b" },
  ],
  regions: [
    { id:1, name:"Valdris Capital",  type:"city",       ctrl:"Kingdom of Valdris", threat:"low",     state:"tense",      visited:true },
    { id:2, name:"Greymoor Marshes", type:"wilderness",  ctrl:"Marsh Wardens",     threat:"medium",  state:"corrupted",  visited:true },
    { id:3, name:"Aldenmire Ruins",  type:"dungeon",     ctrl:"The Hollow",        threat:"extreme", state:"dangerous",  visited:false },
    { id:4, name:"Thornhaven",       type:"town",        ctrl:"The Silver Accord", threat:"low",     state:"rebuilding", visited:true },
    { id:5, name:"Shadowfen",        type:"wilderness",  ctrl:"The Hollow",        threat:"high",    state:"blighted",   visited:true },
    { id:6, name:"King's Road",      type:"route",       ctrl:"Kingdom of Valdris",threat:"medium",  state:"patrolled",  visited:true },
  ],
  npcs: [
    { id:1, name:"Commander Elara Voss", faction:"The Silver Accord", loc:"Thornhaven",       attitude:"allied",   role:"quest giver", alive:true },
    { id:2, name:"The Whisper King",     faction:"The Hollow",        loc:"Unknown",           attitude:"hostile",  role:"antagonist",  alive:true },
    { id:3, name:"Barkeep Milo",         faction:null,                loc:"Thornhaven",       attitude:"friendly", role:"informant",   alive:true },
    { id:4, name:"Warden Thistle",       faction:"Marsh Wardens",     loc:"Greymoor Marshes", attitude:"cautious", role:"ally",        alive:true },
    { id:5, name:"Lord Aldric Valdris",  faction:"Kingdom of Valdris",loc:"Valdris Capital",  attitude:"neutral",  role:"political",   alive:true },
    { id:6, name:"Seraphine the Lost",   faction:"The Hollow",        loc:"Shadowfen",        attitude:"hostile",  role:"lieutenant",  alive:false },
  ],
  timeline: [
    { id:24, n:24, title:"Into the Shadowfen", date:"2026-03-26",
      summary:"The party ventured into the Shadowfen seeking the Shadow Obelisk. They fought corrupted beasts and discovered Seraphine the Lost guarding a ritual site. After a fierce battle, Seraphine was defeated but the obelisk remains active.",
      events:[
        { id:"e1", type:"encounter",    text:"Ambush by 6 Blighted Wolves in the outer marshes",  outcome:"Victory — Fenris badly wounded", dmOnly:false },
        { id:"e2", type:"discovery",    text:"Found Seraphine's journal revealing the Crown's true location", outcome:"New quest lead unlocked", dmOnly:true },
        { id:"e3", type:"encounter",    text:"Boss fight: Seraphine the Lost (CR 11 Shadow Mage)", outcome:"Seraphine slain, obelisk still active", dmOnly:false },
        { id:"e4", type:"world_change", text:"The Hollow's grip on Shadowfen weakens slightly", outcome:"Faction power shift", dmOnly:false },
        { id:"e5", type:"loot",         text:"Acquired Seraphine's Shadow Staff and encoded map", outcome:"Key item obtained", dmOnly:false },
      ],
      changes:["Seraphine the Lost killed","Hollow power reduced","Aldenmire path revealed"], notes:"Party handled the encounter well. Fenris nearly went down twice.", dmOnly:false },
    { id:23, n:23, title:"The Warden's Warning", date:"2026-03-19",
      summary:"Warden Thistle warned the party about growing darkness in the marshes. The party helped defend a druidic shrine and earned the Marsh Wardens' trust.",
      events:[
        { id:"e6", type:"roleplay",     text:"Extended negotiation with Warden Thistle for safe passage", outcome:"Alliance formed", dmOnly:false },
        { id:"e7", type:"encounter",    text:"Defense of the Moonwell Shrine against shadow creatures", outcome:"Shrine protected", dmOnly:false },
        { id:"e8", type:"world_change", text:"Marsh Wardens formally allied with the party", outcome:"Faction relationship upgrade", dmOnly:false },
      ],
      changes:["Marsh Wardens now allied","Moonwell Shrine protected"], notes:"", dmOnly:false },
    { id:22, n:22, title:"Crossroads at King's Road", date:"2026-03-12",
      summary:"Completed the merchant escort quest. Encountered Hollow agents on the road. Learned about political tensions in Valdris.",
      events:[
        { id:"e9", type:"encounter",      text:"Hollow ambush on the merchant caravan", outcome:"Repelled, captured one agent", dmOnly:false },
        { id:"e10", type:"roleplay",       text:"Interrogation of captured Hollow agent", outcome:"Learned of Aldenmire excavation", dmOnly:true },
        { id:"e11", type:"quest_complete", text:"Merchant caravan delivered safely to Thornhaven", outcome:"Gold + merchant guild favor", dmOnly:false },
      ],
      changes:["Merchant Guild favor increased","Intel on Hollow gained"], notes:"", dmOnly:false },
    { id:21, n:21, title:"The Gathering Storm", date:"2026-03-05",
      summary:"Party arrived in Thornhaven. Met Commander Voss, learned about the Shattered Crown's history and the Silver Accord's formation.",
      events:[
        { id:"e12", type:"roleplay",  text:"Council meeting with Silver Accord leadership", outcome:"Main quest briefing received", dmOnly:false },
        { id:"e13", type:"discovery", text:"Ancient texts in Thornhaven library hint at Crown's power", outcome:"Lore unlocked", dmOnly:false },
      ],
      changes:["Silver Accord quest line activated"], notes:"", dmOnly:false },
  ],
  campaignNotes: [],
  activity: [
    { time:"2h ago", text:"Added session 24 notes and loot distribution" },
    { time:"5h ago", text:"Updated Fenris HP after healing rest" },
    { time:"1d ago", text:"Marked Seraphine the Lost as deceased" },
    { time:"1d ago", text:"Updated Hollow faction power (−5)" },
    { time:"2d ago", text:"Added encoded map to party inventory" },
    { time:"3d ago", text:"Scheduled next session: April 2nd" },
  ],
};

// ─── PRIMITIVES ─────────────────────────────────────────────────────────────

const Tag = ({ children, variant = "default" }) => {
  const m = {
    default:  { bg: T.crimsonSoft, c: T.crimson,  b: T.crimsonBorder },
    danger:   { bg: "rgba(192,57,43,0.18)", c: "#e8605a", b: "rgba(192,57,43,0.45)" },
    success:  { bg: "rgba(45,106,79,0.14)", c: "#6fcf97", b: "rgba(45,106,79,0.32)" },
    warning:  { bg: "rgba(217,119,6,0.12)", c: "#f0b860", b: "rgba(217,119,6,0.28)" },
    info:     { bg: "rgba(148,163,184,0.10)", c: "#a8b8cc", b: "rgba(148,163,184,0.25)" },
    critical: { bg: "rgba(192,57,43,0.22)", c: "#ff7070", b: "rgba(192,57,43,0.50)" },
    muted:    { bg: T.bgInput, c: T.textMuted, b: T.border },
  };
  const s = m[variant] || m.default;
  return (
    <span style={{
      display:"inline-block", background:s.bg, color:s.c, border:`1px solid ${s.b}`,
      fontFamily:T.ui, fontSize:"8px", letterSpacing:"1px", textTransform:"uppercase",
      padding:"3px 8px", borderRadius:"2px", fontWeight:500, whiteSpace:"nowrap",
    }}>{children}</span>
  );
};

const HpBar = ({ val, max, color }) => (
  <div style={{ width:"100%", height:6, background:T.bgInput, border:`1px solid ${T.border}`, borderRadius:"2px", overflow:"hidden" }}>
    <div style={{ width:`${Math.round(val/max*100)}%`, height:"100%", background:color||T.crimson, transition:"width 0.3s ease" }} />
  </div>
);

const PowerBar = ({ val, max, color }) => (
  <div style={{ width:"100%", height:4, background:T.bgInput, borderRadius:"2px", overflow:"hidden" }}>
    <div style={{ width:`${Math.round(val/max*100)}%`, height:"100%", background:color||T.crimson, transition:"width 0.3s ease" }} />
  </div>
);

const SectionTitle = ({ icon:Icon, children, count, action }) => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      {Icon && <Icon size={14} color={T.crimson} />}
      <span style={{ fontFamily:T.ui, fontSize:"11px", letterSpacing:"2px", color:T.crimson, textTransform:"uppercase", fontWeight:500 }}>{children}</span>
      {count != null && <span style={{ fontFamily:T.ui, fontSize:"9px", color:T.textMuted, letterSpacing:"1px" }}>({count})</span>}
    </div>
    {action}
  </div>
);

const LinkBtn = ({ children, onClick }) => (
  <button onClick={onClick} style={{
    background:"none", border:"none", cursor:"pointer", padding:0,
    fontFamily:T.ui, fontSize:"9px", letterSpacing:"2px", color:T.textMuted, textTransform:"uppercase",
    fontWeight:500, display:"flex", alignItems:"center", gap:4, transition:"color 0.2s",
  }}>{children}</button>
);

const CrimsonBtn = ({ children, onClick, secondary, small, disabled, style:sx }) => (
  <button onClick={disabled?undefined:onClick} style={{
    padding: small ? "6px 14px" : "10px 24px",
    border: secondary ? `1px solid ${T.border}` : "none",
    background: disabled ? T.bgMid : secondary ? "transparent" : T.crimson,
    color: disabled ? T.textFaint : secondary ? T.textMuted : T.text,
    fontFamily:T.ui, fontSize: small ? "8px" : "9px", letterSpacing:"2px", textTransform:"uppercase",
    cursor: disabled ? "default" : "pointer", borderRadius:"2px", fontWeight:500, transition:"all 0.2s",
    display:"inline-flex", alignItems:"center", gap:8, opacity: disabled ? 0.5 : 1, ...sx,
  }}>{children}</button>
);

const Section = ({ children, style }) => (
  <div style={{
    background:T.bgCard, border:`1px solid ${T.crimsonBorder}`, borderRadius:"4px",
    padding:28, boxShadow:"0 2px 8px rgba(0,0,0,0.08)", ...style,
  }}>{children}</div>
);

const Input = ({ value, onChange, placeholder, style:sx, type="text", ...rest }) => (
  <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} {...rest}
    style={{ padding:"8px 12px", border:`1px solid ${T.border}`, borderRadius:"2px", background:T.bgInput,
      fontSize:13, fontFamily:T.body, color:T.text, outline:"none", width:"100%", ...sx }} />
);

const Select = ({ value, onChange, children, style:sx }) => (
  <select value={value} onChange={e=>onChange(e.target.value)}
    style={{ padding:"8px 12px", border:`1px solid ${T.border}`, borderRadius:"2px", background:T.bgCard,
      fontSize:13, fontFamily:T.body, color:T.text, outline:"none", cursor:"pointer", ...sx }}>
    {children}
  </select>
);

const Textarea = ({ value, onChange, placeholder, rows=4, style:sx }) => (
  <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
    style={{ padding:"10px 12px", border:`1px solid ${T.border}`, borderRadius:"2px", background:T.bgInput,
      fontSize:13, fontFamily:T.body, color:T.text, outline:"none", width:"100%", resize:"vertical",
      lineHeight:1.7, ...sx }} />
);

const Modal = ({ open, onClose, title, children, wide }) => {
  if (!open) return null;
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:32 }}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:T.bgCard, border:`1px solid ${T.crimsonBorder}`, borderRadius:"4px",
        width: wide ? 740 : 520, maxHeight:"85vh", overflow:"hidden", display:"flex", flexDirection:"column",
        boxShadow:"0 12px 40px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 24px", borderBottom:`1px solid ${T.border}` }}>
          <span style={{ fontFamily:T.ui, fontSize:11, letterSpacing:"2px", color:T.crimson, textTransform:"uppercase", fontWeight:500 }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:T.textFaint, padding:4 }}><X size={16}/></button>
        </div>
        <div style={{ padding:24, overflowY:"auto", flex:1 }}>{children}</div>
      </div>
    </div>
  );
};

const ToggleSwitch = ({ on, onToggle, label }) => (
  <div onClick={onToggle} style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer", padding:"8px 0" }}>
    {on ? <ToggleRight size={22} color={T.crimson}/> : <ToggleLeft size={22} color={T.textFaint}/>}
    <span style={{ fontSize:13, fontFamily:T.body, color: on ? T.text : T.textMuted, fontWeight:300 }}>{label}</span>
  </div>
);

function useCountdown(target) {
  const [s,setS] = useState("");
  useEffect(() => {
    const tick = () => {
      const d = new Date(target) - new Date();
      if (d<=0) { setS("Now"); return; }
      const days=Math.floor(d/864e5), hrs=Math.floor((d%864e5)/36e5), min=Math.floor((d%36e5)/6e4);
      setS(days>0 ? `${days}d ${hrs}h` : `${hrs}h ${min}m`);
    };
    tick(); const id=setInterval(tick,60000); return ()=>clearInterval(id);
  }, [target]);
  return s;
}

let _eid = 100;
const eid = () => `e${_eid++}`;
let _id = 100;
const uid = () => _id++;

// ─── FANTASY MAP ICONS (hand-drawn cartography style) ───────────────────────

const MapIconMountain = ({ size=32, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Main peak — organic, slightly asymmetric */}
    <path d="M24 6 C23 6, 14 22, 10 32 Q9.5 33, 10 33.5 L17 33 Q18 28, 20 24 C21 22, 22.5 18, 24 14 C25.5 18, 27 22, 28 24 Q30 28, 31 33 L38 33.5 Q38.5 33, 38 32 C34 22, 25 6, 24 6Z" fill={color} opacity="0.12"/>
    <path d="M24 6 C23 6, 14 22, 10 32 Q9.5 33, 10 33.5 L17 33 Q18 28, 20 24 C21 22, 22.5 18, 24 14 C25.5 18, 27 22, 28 24 Q30 28, 31 33 L38 33.5 Q38.5 33, 38 32 C34 22, 25 6, 24 6Z" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {/* Snow cap — jagged */}
    <path d="M24 6 C23.2 6, 20 13, 18.5 17 L21 15.5 L22 17 L24 12 L26 17 L27 15.5 L29.5 17 C28 13, 24.8 6, 24 6Z" fill={color} opacity="0.25"/>
    {/* Left secondary peak */}
    <path d="M12 33 C11 33, 7 26, 5 22 Q4 20.5, 4 22 C3 27, 2 33, 3 34 Q3.5 34.5, 4 34 L12 34Z" fill={color} opacity="0.08"/>
    <path d="M5 22 Q4 20.5, 4 22 C3 27, 2 33, 3 34 L12 34 L12 33 C11 33, 7 26, 5 22Z" stroke={color} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6"/>
    {/* Right secondary peak */}
    <path d="M36 33 C37 33, 41 27, 43 23 Q44 21.5, 44 23 C45 28, 46 33, 45 34 Q44.5 34.5, 44 34 L36 34Z" fill={color} opacity="0.08"/>
    <path d="M43 23 Q44 21.5, 44 23 C45 28, 46 33, 45 34 L36 34 L36 33 C37 33, 41 27, 43 23Z" stroke={color} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6"/>
    {/* Ridgelines for texture */}
    <path d="M19 25 Q21 21, 24 14" stroke={color} strokeWidth="0.7" strokeLinecap="round" opacity="0.3" fill="none"/>
    <path d="M29 25 Q27 21, 24 14" stroke={color} strokeWidth="0.7" strokeLinecap="round" opacity="0.3" fill="none"/>
    {/* Ground line */}
    <path d="M1 34 Q12 33, 24 34 Q36 35, 47 34" stroke={color} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.4"/>
  </svg>
);

const MapIconMountainSmall = ({ size=24, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 5 C15 5, 8 17, 5 23 Q4.5 24, 5 24 L27 24 Q27.5 24, 27 23 C24 17, 17 5, 16 5Z" fill={color} opacity="0.1"/>
    <path d="M16 5 C15 5, 8 17, 5 23 L27 23 C24 17, 17 5, 16 5Z" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M16 5 C15.5 5, 13 10, 12 13 L14 11.5 L16 8 L18 11.5 L20 13 C19 10, 16.5 5, 16 5Z" fill={color} opacity="0.2"/>
    <path d="M11 18 Q13 14, 16 8" stroke={color} strokeWidth="0.6" opacity="0.25" fill="none"/>
    <path d="M2 24 Q16 23, 30 24" stroke={color} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.35"/>
  </svg>
);

const MapIconTree = ({ size=28, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 32 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Organic deciduous tree with layered canopy */}
    <path d="M16 30 L16 20" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M14.5 24 Q12 25, 11 24" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
    <path d="M17.5 22 Q19 23, 20 22" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
    {/* Canopy — multiple organic blobs */}
    <path d="M16 4 C10 4, 5 9, 6 14 C4 15, 4 19, 7 20 C6 22, 9 25, 13 24 C14 26, 18 26, 19 24 C23 25, 26 22, 25 20 C28 19, 28 15, 26 14 C27 9, 22 4, 16 4Z" fill={color} opacity="0.15"/>
    <path d="M16 4 C10 4, 5 9, 6 14 C4 15, 4 19, 7 20 C6 22, 9 25, 13 24 C14 26, 18 26, 19 24 C23 25, 26 22, 25 20 C28 19, 28 15, 26 14 C27 9, 22 4, 16 4Z" stroke={color} strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    {/* Inner texture */}
    <path d="M10 14 Q13 11, 16 12 Q19 11, 22 14" stroke={color} strokeWidth="0.6" opacity="0.2" fill="none"/>
    <path d="M8 19 Q12 17, 16 18 Q20 17, 24 19" stroke={color} strokeWidth="0.6" opacity="0.2" fill="none"/>
  </svg>
);

const MapIconForest = ({ size=32, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 48 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Cluster of 3 trees with varying sizes */}
    {/* Back tree (left) */}
    <path d="M14 28 L14 21" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M14 8 C9 8, 5 12, 6 16 C4 17, 5 21, 8 21 C8 23, 12 24, 14 22 C16 24, 20 23, 20 21 C23 21, 24 17, 22 16 C23 12, 19 8, 14 8Z" fill={color} opacity="0.12"/>
    <path d="M14 8 C9 8, 5 12, 6 16 C4 17, 5 21, 8 21 C8 23, 12 24, 14 22 C16 24, 20 23, 20 21 C23 21, 24 17, 22 16 C23 12, 19 8, 14 8Z" stroke={color} strokeWidth="1.1" strokeLinecap="round" fill="none"/>
    {/* Front tree (right, slightly larger) */}
    <path d="M32 30 L32 22" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M32 7 C26 7, 22 12, 23 16 C21 17, 21 21, 24 22 C23 24, 27 26, 30 24 C31 26, 35 26, 36 24 C39 25, 42 22, 41 20 C44 19, 44 15, 41 14 C43 10, 38 7, 32 7Z" fill={color} opacity="0.12"/>
    <path d="M32 7 C26 7, 22 12, 23 16 C21 17, 21 21, 24 22 C23 24, 27 26, 30 24 C31 26, 35 26, 36 24 C39 25, 42 22, 41 20 C44 19, 44 15, 41 14 C43 10, 38 7, 32 7Z" stroke={color} strokeWidth="1.1" strokeLinecap="round" fill="none"/>
    {/* Middle small tree */}
    <path d="M22 29 L22 24" stroke={color} strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M22 14 C19 14, 16 17, 17 19 C16 20, 17 22, 19 22 C19 24, 22 25, 24 23 C26 24, 28 22, 27 20 C29 19, 28 16, 26 16 C27 14, 25 12, 22 14Z" fill={color} opacity="0.1"/>
    <path d="M22 14 C19 14, 16 17, 17 19 C16 20, 17 22, 19 22 C19 24, 22 25, 24 23 C26 24, 28 22, 27 20 C29 19, 28 16, 26 16 C27 14, 25 12, 22 14Z" stroke={color} strokeWidth="0.9" strokeLinecap="round" fill="none" opacity="0.7"/>
    {/* Ground line */}
    <path d="M2 30 Q16 29, 30 30 Q40 31, 46 30" stroke={color} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.3"/>
  </svg>
);

const MapIconCity = ({ size=32, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Walled city with towers and central keep */}
    {/* Wall base */}
    <rect x="6" y="22" width="28" height="12" rx="1" fill={color} opacity="0.08"/>
    <path d="M6 22 L6 34 L34 34 L34 22" stroke={color} strokeWidth="1.3" strokeLinecap="round" fill="none"/>
    {/* Wall battlements */}
    <path d="M6 22 L6 20 L9 20 L9 22 L11 22 L11 20 L14 20 L14 22 L16 22 L16 20 L19 20 L19 22 L21 22 L21 20 L24 20 L24 22 L26 22 L26 20 L29 20 L29 22 L31 22 L31 20 L34 20 L34 22" stroke={color} strokeWidth="1.1" fill="none"/>
    {/* Gate */}
    <path d="M17 34 L17 27 Q20 24, 23 27 L23 34" stroke={color} strokeWidth="1.2" fill="none"/>
    <line x1="20" y1="27" x2="20" y2="34" stroke={color} strokeWidth="0.6" opacity="0.4"/>
    {/* Central keep tower */}
    <rect x="17" y="10" width="6" height="12" fill={color} opacity="0.1"/>
    <path d="M17 22 L17 10 L23 10 L23 22" stroke={color} strokeWidth="1.2" fill="none"/>
    <path d="M16 10 L20 5 L24 10" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {/* Flag on keep */}
    <line x1="20" y1="5" x2="20" y2="2" stroke={color} strokeWidth="0.8"/>
    <path d="M20 2 L24 3.5 L20 5" fill={color} opacity="0.3"/>
    <path d="M20 2 L24 3.5 L20 5" stroke={color} strokeWidth="0.7" fill="none"/>
    {/* Left tower */}
    <rect x="4" y="15" width="5" height="7" fill={color} opacity="0.08"/>
    <path d="M4 22 L4 15 L9 15 L9 22" stroke={color} strokeWidth="1.1" fill="none"/>
    <path d="M3 15 L6.5 11 L10 15" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {/* Right tower */}
    <rect x="31" y="15" width="5" height="7" fill={color} opacity="0.08"/>
    <path d="M31 22 L31 15 L36 15 L36 22" stroke={color} strokeWidth="1.1" fill="none"/>
    <path d="M30 15 L33.5 11 L37 15" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {/* Windows */}
    <circle cx="6.5" cy="18" r="0.8" fill={color} opacity="0.4"/>
    <circle cx="33.5" cy="18" r="0.8" fill={color} opacity="0.4"/>
    <circle cx="20" cy="14" r="1" fill={color} opacity="0.4"/>
  </svg>
);

const MapIconTown = ({ size=28, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Small town — cluster of buildings with a church spire */}
    {/* Main building left */}
    <rect x="6" y="20" width="8" height="10" fill={color} opacity="0.08"/>
    <path d="M6 30 L6 20 L14 20 L14 30" stroke={color} strokeWidth="1.2" fill="none"/>
    <path d="M5 20 L10 15 L15 20" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {/* Church/tall building center */}
    <rect x="14" y="16" width="7" height="14" fill={color} opacity="0.08"/>
    <path d="M14 30 L14 16 L21 16 L21 30" stroke={color} strokeWidth="1.2" fill="none"/>
    <path d="M13 16 L17.5 9 L22 16" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <line x1="17.5" y1="9" x2="17.5" y2="6" stroke={color} strokeWidth="0.8"/>
    <circle cx="17.5" cy="5.5" r="1" stroke={color} strokeWidth="0.7" fill="none"/>
    {/* Small building right */}
    <rect x="21" y="22" width="7" height="8" fill={color} opacity="0.08"/>
    <path d="M21 30 L21 22 L28 22 L28 30" stroke={color} strokeWidth="1.2" fill="none"/>
    <path d="M20 22 L24.5 18 L29 22" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {/* Windows */}
    <rect x="8" y="23" width="2" height="2.5" rx="0.3" stroke={color} strokeWidth="0.6" fill="none" opacity="0.5"/>
    <rect x="16" y="20" width="2" height="2.5" rx="0.3" stroke={color} strokeWidth="0.6" fill="none" opacity="0.5"/>
    <rect x="23" y="25" width="2" height="2" rx="0.3" stroke={color} strokeWidth="0.6" fill="none" opacity="0.5"/>
    {/* Ground */}
    <path d="M2 30 Q18 29, 34 30" stroke={color} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.35"/>
  </svg>
);

const MapIconHamlet = ({ size=24, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Tiny village — 2 small houses */}
    <rect x="4" y="16" width="7" height="7" fill={color} opacity="0.08"/>
    <path d="M4 23 L4 16 L11 16 L11 23" stroke={color} strokeWidth="1.1" fill="none"/>
    <path d="M3 16 L7.5 12 L12 16" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <rect x="14" y="18" width="6" height="5" fill={color} opacity="0.06"/>
    <path d="M14 23 L14 18 L20 18 L20 23" stroke={color} strokeWidth="1" fill="none"/>
    <path d="M13 18 L17 15 L21 18" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {/* Smoke wisps */}
    <path d="M7.5 12 Q7 10, 8 8 Q7.5 6, 8.5 5" stroke={color} strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.3"/>
    {/* Ground */}
    <path d="M1 23 Q14 22, 27 23" stroke={color} strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.3"/>
  </svg>
);

const MapIconKingdom = ({ size=36, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Grand capital — large castle with crown motif */}
    {/* Base wall */}
    <rect x="5" y="25" width="34" height="12" rx="1" fill={color} opacity="0.08"/>
    <path d="M5 25 L5 37 L39 37 L39 25" stroke={color} strokeWidth="1.3" fill="none"/>
    {/* Battlements */}
    <path d="M5 25 L5 23 L8 23 L8 25 L10 25 L10 23 L13 23 L13 25 L15 25 L15 23 L18 23 L18 25 L20 25 L20 23 L24 23 L24 25 L26 25 L26 23 L29 23 L29 25 L31 25 L31 23 L34 23 L34 25 L36 25 L36 23 L39 23 L39 25" stroke={color} strokeWidth="1" fill="none"/>
    {/* Grand gate with arch */}
    <path d="M18 37 L18 29 Q22 24, 26 29 L26 37" stroke={color} strokeWidth="1.3" fill="none"/>
    {/* Central grand tower */}
    <rect x="18" y="12" width="8" height="13" fill={color} opacity="0.1"/>
    <path d="M18 25 L18 12 L26 12 L26 25" stroke={color} strokeWidth="1.2" fill="none"/>
    {/* Crown-shaped top on central tower */}
    <path d="M17 12 L18 8 L20 11 L22 6 L24 11 L26 8 L27 12" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <circle cx="22" cy="5" r="1.2" fill={color} opacity="0.3"/>
    <circle cx="22" cy="5" r="1.2" stroke={color} strokeWidth="0.7" fill="none"/>
    {/* Left tower */}
    <rect x="3" y="17" width="6" height="8" fill={color} opacity="0.08"/>
    <path d="M3 25 L3 17 L9 17 L9 25" stroke={color} strokeWidth="1.1" fill="none"/>
    <path d="M2 17 L6 12 L10 17" stroke={color} strokeWidth="1.1" strokeLinecap="round" fill="none"/>
    <line x1="6" y1="12" x2="6" y2="9" stroke={color} strokeWidth="0.8"/>
    <path d="M6 9 L9 10.5 L6 12" fill={color} opacity="0.25"/>
    {/* Right tower */}
    <rect x="35" y="17" width="6" height="8" fill={color} opacity="0.08"/>
    <path d="M35 25 L35 17 L41 17 L41 25" stroke={color} strokeWidth="1.1" fill="none"/>
    <path d="M34 17 L38 12 L42 17" stroke={color} strokeWidth="1.1" strokeLinecap="round" fill="none"/>
    <line x1="38" y1="12" x2="38" y2="9" stroke={color} strokeWidth="0.8"/>
    <path d="M38 9 L41 10.5 L38 12" fill={color} opacity="0.25"/>
    {/* Windows */}
    <circle cx="6" cy="20" r="0.8" fill={color} opacity="0.4"/>
    <circle cx="38" cy="20" r="0.8" fill={color} opacity="0.4"/>
    <circle cx="22" cy="16" r="1.2" fill={color} opacity="0.35"/>
    <rect x="20" y="19" width="4" height="3" rx="0.3" stroke={color} strokeWidth="0.5" fill="none" opacity="0.3"/>
  </svg>
);

const MapIconRuins = ({ size=28, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Crumbling ruins — broken walls and pillars */}
    {/* Left broken pillar */}
    <path d="M8 30 L8 14 Q8 12, 9 13 L10 16 L10 30" stroke={color} strokeWidth="1.2" fill="none"/>
    <path d="M7 14 L11 12 L11 14" stroke={color} strokeWidth="0.8" fill="none" opacity="0.6"/>
    {/* Center broken wall */}
    <path d="M14 30 L14 18 L16 16 L18 19 L19 17 L21 20 L22 18 L23 30" stroke={color} strokeWidth="1.2" fill="none"/>
    <path d="M14 18 L14 30 L23 30 L23 18" fill={color} opacity="0.06"/>
    {/* Right tall broken pillar */}
    <path d="M27 30 L27 10 L29 10 L29 30" stroke={color} strokeWidth="1.1" fill="none"/>
    <path d="M26 10 L28 7 L30 10" stroke={color} strokeWidth="0.9" strokeLinecap="round" fill="none"/>
    {/* Scattered rubble */}
    <circle cx="12" cy="29" r="1.2" stroke={color} strokeWidth="0.7" fill={color} opacity="0.15"/>
    <circle cx="25" cy="29.5" r="0.8" stroke={color} strokeWidth="0.6" fill={color} opacity="0.12"/>
    <rect x="16" y="28" width="2" height="1.5" rx="0.3" stroke={color} strokeWidth="0.5" fill="none" opacity="0.4" transform="rotate(-12 17 28.5)"/>
    {/* Cracks in wall */}
    <path d="M17 22 L18 25 L16 27" stroke={color} strokeWidth="0.5" opacity="0.3" fill="none"/>
    <path d="M20 21 L19 24" stroke={color} strokeWidth="0.5" opacity="0.3" fill="none"/>
    {/* Ground */}
    <path d="M3 30 Q18 29, 33 30" stroke={color} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.35"/>
    {/* Overgrown vine */}
    <path d="M27 20 Q30 18, 31 20 Q32 22, 30 23" stroke={color} strokeWidth="0.6" opacity="0.3" fill="none"/>
  </svg>
);

const MapIconDungeon = ({ size=28, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Cave/dungeon entrance in hillside */}
    {/* Hill mound */}
    <path d="M2 30 Q6 18, 18 14 Q30 18, 34 30" fill={color} opacity="0.08"/>
    <path d="M2 30 Q6 18, 18 14 Q30 18, 34 30" stroke={color} strokeWidth="1.3" strokeLinecap="round" fill="none"/>
    {/* Dark cave opening */}
    <path d="M12 30 Q12 22, 18 20 Q24 22, 24 30" fill={color} opacity="0.25"/>
    <path d="M12 30 Q12 22, 18 20 Q24 22, 24 30" stroke={color} strokeWidth="1.3" strokeLinecap="round" fill="none"/>
    {/* Stalactites */}
    <path d="M14 22 L14.5 25" stroke={color} strokeWidth="0.7" strokeLinecap="round" opacity="0.5"/>
    <path d="M17 20.5 L17 24" stroke={color} strokeWidth="0.7" strokeLinecap="round" opacity="0.5"/>
    <path d="M21 21 L20.5 24" stroke={color} strokeWidth="0.7" strokeLinecap="round" opacity="0.5"/>
    {/* Skull warning */}
    <circle cx="18" cy="27" r="2" stroke={color} strokeWidth="0.8" fill="none" opacity="0.4"/>
    <circle cx="17" cy="26.5" r="0.5" fill={color} opacity="0.4"/>
    <circle cx="19" cy="26.5" r="0.5" fill={color} opacity="0.4"/>
    {/* Rocks */}
    <circle cx="10" cy="28" r="1.5" stroke={color} strokeWidth="0.7" fill="none" opacity="0.3"/>
    <circle cx="26" cy="28" r="1" stroke={color} strokeWidth="0.6" fill="none" opacity="0.3"/>
    {/* Ground */}
    <path d="M1 30 Q18 29, 35 30" stroke={color} strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.35"/>
  </svg>
);

const MapIconRoute = ({ size=24, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Winding road with signpost */}
    <path d="M6 28 Q10 22, 16 20 Q22 18, 20 12 Q18 8, 22 4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="4 3" fill="none" opacity="0.5"/>
    {/* Signpost */}
    <line x1="16" y1="14" x2="16" y2="22" stroke={color} strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M16 14 L22 13 L22 16 L16 17" stroke={color} strokeWidth="1" fill={color} opacity="0.12"/>
    <path d="M16 14 L22 13 L22 16 L16 17" stroke={color} strokeWidth="1" fill="none"/>
    <path d="M16 16 L11 15.5 L11 18 L16 18.5" stroke={color} strokeWidth="0.9" fill={color} opacity="0.08"/>
    <path d="M16 16 L11 15.5 L11 18 L16 18.5" stroke={color} strokeWidth="0.9" fill="none" opacity="0.7"/>
  </svg>
);

const MapIconCastle = ({ size=28, color="currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Fortified castle on a hill */}
    {/* Hill */}
    <path d="M3 32 Q10 26, 18 25 Q26 26, 33 32" fill={color} opacity="0.06"/>
    <path d="M3 32 Q10 26, 18 25 Q26 26, 33 32" stroke={color} strokeWidth="1" fill="none" opacity="0.4"/>
    {/* Main wall */}
    <path d="M8 25 L8 17 L28 17 L28 25" stroke={color} strokeWidth="1.2" fill="none"/>
    <rect x="8" y="17" width="20" height="8" fill={color} opacity="0.08"/>
    {/* Battlements */}
    <path d="M8 17 L8 15.5 L10 15.5 L10 17 L12 17 L12 15.5 L14 15.5 L14 17 L16 17 L16 15.5 L20 15.5 L20 17 L22 17 L22 15.5 L24 15.5 L24 17 L26 17 L26 15.5 L28 15.5 L28 17" stroke={color} strokeWidth="0.9" fill="none"/>
    {/* Central tower */}
    <path d="M15 17 L15 9 L21 9 L21 17" stroke={color} strokeWidth="1.1" fill="none"/>
    <rect x="15" y="9" width="6" height="8" fill={color} opacity="0.08"/>
    <path d="M14 9 L18 5 L22 9" stroke={color} strokeWidth="1.1" strokeLinecap="round" fill="none"/>
    {/* Flag */}
    <line x1="18" y1="5" x2="18" y2="2" stroke={color} strokeWidth="0.7"/>
    <path d="M18 2 L21 3 L18 4" fill={color} opacity="0.3"/>
    {/* Gate */}
    <path d="M16 25 L16 21 Q18 19, 20 21 L20 25" stroke={color} strokeWidth="1" fill="none"/>
  </svg>
);

/* Map of region type → fantasy icon component */
const FANTASY_ICONS = {
  city: MapIconCity,
  town: MapIconTown,
  hamlet: MapIconHamlet,
  kingdom: MapIconKingdom,
  capital: MapIconKingdom,
  wilderness: MapIconMountain,
  mountain: MapIconMountain,
  forest: MapIconForest,
  dungeon: MapIconDungeon,
  ruins: MapIconRuins,
  castle: MapIconCastle,
  route: MapIconRoute,
  cave: MapIconDungeon,
  shrine: MapIconRuins,
  tower: MapIconCastle,
  grove: MapIconForest,
  monolith: MapIconRuins,
};

const getFantasyIcon = (type) => FANTASY_ICONS[type] || MapIconRoute;

// ─── DICE ROLLER ────────────────────────────────────────────────────────────

function DiceRoller() {
  const [results,setResults] = useState([]);
  const [die,setDie] = useState(20);
  const [mod,setMod] = useState(0);
  const [count,setCount] = useState(1);
  const [rolling,setRolling] = useState(false);
  const dice = [4,6,8,10,12,20,100];

  const roll = useCallback(() => {
    setRolling(true);
    setTimeout(() => {
      const rolls = Array.from({length:count}, ()=> Math.floor(Math.random()*die)+1);
      const total = rolls.reduce((a,b)=>a+b,0) + mod;
      const hasCrit = die===20 && rolls.some(r=>r===20);
      const hasFumble = die===20 && rolls.some(r=>r===1);
      setResults(p => [{ die, rolls, count, mod, total, crit:hasCrit, fumble:hasFumble, t:Date.now() }, ...p].slice(0,20));
      setRolling(false);
    }, 250);
  }, [die,mod,count]);

  return (
    <div>
      <div style={{ display:"flex", gap:4, marginBottom:12, flexWrap:"wrap" }}>
        {dice.map(d => (
          <button key={d} onClick={()=>setDie(d)} style={{
            padding:"5px 8px", background: d===die ? T.crimson : "transparent",
            border:`1px solid ${d===die ? T.crimson : T.border}`,
            color: d===die ? T.text : T.textMuted,
            fontFamily:T.ui, fontSize:"10px", cursor:"pointer", borderRadius:"2px",
            fontWeight:500, transition:"all 0.15s",
          }}>d{d}</button>
        ))}
      </div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:16, marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontFamily:T.ui, fontSize:8, color:T.textMuted, letterSpacing:"1px" }}>COUNT</span>
          <button onClick={()=>setCount(c=>Math.max(1,c-1))} style={{ width:24, height:24, background:"transparent", border:`1px solid ${T.border}`, color:T.textMuted, fontSize:14, cursor:"pointer", borderRadius:"2px", display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
          <span style={{ fontFamily:T.ui, fontSize:14, color:T.text, fontWeight:500, minWidth:20, textAlign:"center" }}>{count}</span>
          <button onClick={()=>setCount(c=>Math.min(10,c+1))} style={{ width:24, height:24, background:"transparent", border:`1px solid ${T.border}`, color:T.textMuted, fontSize:14, cursor:"pointer", borderRadius:"2px", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
        </div>
        <div style={{ width:1, height:20, background:T.border }}/>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ fontFamily:T.ui, fontSize:8, color:T.textMuted, letterSpacing:"1px" }}>MOD</span>
          <button onClick={()=>setMod(m=>m-1)} style={{ width:24, height:24, background:"transparent", border:`1px solid ${T.border}`, color:T.textMuted, fontSize:14, cursor:"pointer", borderRadius:"2px", display:"flex", alignItems:"center", justifyContent:"center" }}>−</button>
          <span style={{ fontFamily:T.ui, fontSize:14, color:T.text, fontWeight:500, minWidth:30, textAlign:"center" }}>{mod>=0?`+${mod}`:mod}</span>
          <button onClick={()=>setMod(m=>m+1)} style={{ width:24, height:24, background:"transparent", border:`1px solid ${T.border}`, color:T.textMuted, fontSize:14, cursor:"pointer", borderRadius:"2px", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
        </div>
      </div>
      <button onClick={roll} disabled={rolling} style={{
        width:"100%", padding:10, background:rolling?T.crimsonDim:T.crimson, border:"none",
        color:T.text, fontFamily:T.ui, fontSize:"10px", letterSpacing:"2px", textTransform:"uppercase",
        cursor:rolling?"default":"pointer", borderRadius:"2px", fontWeight:500, marginBottom:8, transition:"all 0.2s",
      }}>{rolling ? "Rolling..." : `Roll ${count}d${die}${mod?mod>0?`+${mod}`:mod:""}`}</button>
      {results.length > 0 && (
        <div style={{ borderTop:`1px solid ${T.border}`, marginTop:8, paddingTop:8 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ fontFamily:T.ui, fontSize:8, color:T.textFaint, letterSpacing:"1px" }}>HISTORY</span>
            <button onClick={()=>setResults([])} style={{ background:"none", border:"none", cursor:"pointer", fontFamily:T.ui, fontSize:8, color:T.textFaint, letterSpacing:"1px" }}>CLEAR</button>
          </div>
          {results.map((r,i) => (
            <div key={r.t} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", fontSize:12, color:T.textDim, opacity:i===0?1:Math.max(0.35,1-i*0.08) }}>
              <span style={{ fontFamily:T.ui, fontSize:10, color:T.textMuted }}>
                {r.count>1?`${r.count}`:""}{r.die===100?"d%":`d${r.die}`}{r.mod!==0?(r.mod>0?`+${r.mod}`:r.mod):""}
                {r.count>1 && <span style={{ color:T.textFaint, marginLeft:4 }}>[{r.rolls.join(", ")}]</span>}
              </span>
              <span style={{ fontWeight:500, color: r.crit?"#f1c40f":r.fumble?"#e74c3c":T.text, textShadow: r.crit?"0 0 12px rgba(241,196,15,0.5)":r.fumble?"0 0 12px rgba(231,76,60,0.5)":"none" }}>
                {r.total} {r.crit?"NAT 20!":r.fumble?"NAT 1":""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── INITIATIVE TRACKER ─────────────────────────────────────────────────────

function InitiativeTracker({ party }) {
  const [combatants,setCombatants] = useState([]);
  const [turn,setTurn] = useState(0);
  const [round,setRound] = useState(1);
  const [live,setLive] = useState(false);
  const [name,setName] = useState("");
  const [init,setInit] = useState("");
  const [hpVal,setHpVal] = useState("");
  const [acVal,setAcVal] = useState("");
  const [conditions,setConditions] = useState({});

  const start = () => {
    const pcs = party.map(p => ({ id:`pc-${p.id}`, name:p.name, init:Math.floor(Math.random()*20)+1, hp:p.hp, maxHp:p.maxHp, ac:p.ac, type:"pc" }));
    setCombatants(pcs.sort((a,b)=>b.init-a.init));
    setTurn(0); setRound(1); setLive(true); setConditions({});
  };
  const next = () => {
    let nextIdx = turn + 1;
    while (nextIdx < combatants.length && combatants[nextIdx].hp <= 0) nextIdx++;
    if (nextIdx >= combatants.length) {
      setRound(r=>r+1);
      let first = 0;
      while (first < combatants.length && combatants[first].hp <= 0) first++;
      setTurn(first);
    } else setTurn(nextIdx);
  };
  const prev = () => {
    if (turn === 0 && round === 1) return;
    let prevIdx = turn - 1;
    if (prevIdx < 0) { setRound(r=>Math.max(1,r-1)); prevIdx = combatants.length - 1; }
    while (prevIdx >= 0 && combatants[prevIdx].hp <= 0) prevIdx--;
    if (prevIdx >= 0) setTurn(prevIdx);
  };
  const adjHp = (id,d) => setCombatants(p=>p.map(c=>c.id===id?{...c,hp:Math.max(0,Math.min(c.maxHp,c.hp+d))}:c));
  const remove = (id) => { setCombatants(p=>p.filter(c=>c.id!==id)); if(turn >= combatants.length-1) setTurn(t=>Math.max(0,t-1)); };
  const addCondition = (id, cond) => { if(!cond) return; setConditions(p=>({...p, [id]: [...(p[id]||[]), cond]})); };
  const removeCondition = (id, idx) => { setConditions(p=>({...p, [id]: (p[id]||[]).filter((_,i)=>i!==idx)})); };
  const add = () => {
    if(!name.trim()||!init) return;
    const newC = {id:`c-${Date.now()}`,name,init:parseInt(init),hp:parseInt(hpVal)||30,maxHp:parseInt(hpVal)||30,ac:parseInt(acVal)||12,type:"enemy"};
    setCombatants(p=>[...p,newC].sort((a,b)=>b.init-a.init));
    setName(""); setInit(""); setHpVal(""); setAcVal("");
  };

  const conditionsList = ["Blinded","Charmed","Deafened","Frightened","Grappled","Incapacitated","Invisible","Paralyzed","Petrified","Poisoned","Prone","Restrained","Stunned","Unconscious","Concentrating"];

  if(!live) return (
    <div style={{ textAlign:"center", padding:"28px 0" }}>
      <Swords size={28} color={T.textFaint} style={{ marginBottom:10 }} />
      <p style={{ fontFamily:T.body, fontSize:14, color:T.textMuted, fontStyle:"italic", fontWeight:300, marginBottom:18 }}>No active encounter</p>
      <CrimsonBtn onClick={start}><Swords size={13}/> Start Encounter</CrimsonBtn>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Tag variant="danger">Round {round}</Tag>
          <span style={{ fontFamily:T.ui, fontSize:9, color:T.textFaint, letterSpacing:"1px" }}>{turn+1}/{combatants.length}</span>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <CrimsonBtn onClick={prev} secondary small><ChevronUp size={11}/></CrimsonBtn>
          <CrimsonBtn onClick={next} secondary small><SkipForward size={11}/> Next</CrimsonBtn>
          <CrimsonBtn onClick={()=>{setLive(false);setCombatants([]);}} secondary small>End</CrimsonBtn>
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:2, maxHeight:320, overflowY:"auto" }}>
        {combatants.map((c,i) => (
          <div key={c.id} style={{
            padding:"8px 10px", background: i===turn ? T.crimsonSoft : "transparent",
            borderRadius:"2px", borderLeft: i===turn ? `3px solid ${T.crimson}` : "3px solid transparent",
            opacity: c.hp<=0 ? 0.3 : 1, transition:"all 0.15s",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:12, fontFamily:T.body, fontWeight:500, color:T.textFaint, minWidth:20 }}>{c.init}</span>
              <span style={{ width:5, height:5, borderRadius:"50%", flexShrink:0, background:c.type==="pc"?"#6fcf97":T.crimson }} />
              <span style={{ flex:1, fontSize:13, fontFamily:T.body, fontWeight:400, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</span>
              <span style={{ fontFamily:T.ui, fontSize:8, color:T.textFaint, letterSpacing:"1px" }}>AC {c.ac}</span>
              <div style={{ display:"flex", alignItems:"center", gap:2 }}>
                <button onClick={()=>adjHp(c.id,-5)} style={{ background:"none", border:"none", cursor:"pointer", color:T.crimson, fontSize:14, padding:"2px 4px" }}>−</button>
                <span style={{ fontSize:11, fontFamily:T.body, fontWeight:500, minWidth:42, textAlign:"center", color:c.hp<=c.maxHp*0.25?T.crimson:c.hp<=c.maxHp*0.5?"#d97706":T.textDim }}>{c.hp}/{c.maxHp}</span>
                <button onClick={()=>adjHp(c.id,5)} style={{ background:"none", border:"none", cursor:"pointer", color:"#6fcf97", fontSize:14, padding:"2px 4px" }}>+</button>
              </div>
              {c.type==="enemy" && <button onClick={()=>remove(c.id)} style={{ background:"none", border:"none", cursor:"pointer", color:T.textFaint, padding:"2px" }}><X size={10}/></button>}
            </div>
            {(conditions[c.id]||[]).length > 0 && (
              <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:4, paddingLeft:28 }}>
                {(conditions[c.id]||[]).map((cond,ci) => (
                  <span key={ci} onClick={()=>removeCondition(c.id,ci)} style={{
                    display:"inline-flex", alignItems:"center", gap:3, background:T.crimsonSoft, border:`1px solid ${T.crimsonBorder}`,
                    padding:"1px 6px", borderRadius:"2px", fontSize:8, fontFamily:T.ui, letterSpacing:"0.5px", color:T.crimson, cursor:"pointer", textTransform:"uppercase",
                  }}>{cond} <X size={7}/></span>
                ))}
              </div>
            )}
            {i === turn && c.hp > 0 && (
              <div style={{ paddingLeft:28, marginTop:4 }}>
                <select onChange={e=>{addCondition(c.id,e.target.value);e.target.value="";}} value=""
                  style={{ padding:"3px 6px", fontSize:10, fontFamily:T.ui, background:T.bgInput, border:`1px solid ${T.border}`, color:T.textMuted, borderRadius:"2px", cursor:"pointer" }}>
                  <option value="">+ Condition</option>
                  {conditionsList.map(co=><option key={co} value={co}>{co}</option>)}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:6, marginTop:12, paddingTop:12, borderTop:`1px solid ${T.borderMid}` }}>
        <Input value={name} onChange={setName} placeholder="Name" style={{ flex:1 }} />
        <Input value={init} onChange={setInit} placeholder="Init" type="number" style={{ width:48, textAlign:"center" }} />
        <Input value={hpVal} onChange={setHpVal} placeholder="HP" type="number" style={{ width:48, textAlign:"center" }} />
        <Input value={acVal} onChange={setAcVal} placeholder="AC" type="number" style={{ width:48, textAlign:"center" }} />
        <CrimsonBtn onClick={add} secondary small><Plus size={12}/></CrimsonBtn>
      </div>
    </div>
  );
}

// ─── SESSION SCHEDULER (inline, no wrapper) ────────────────────────────────

function SessionSchedulerInline({ data, setData }) {
  const sched = data.sessionSchedule;
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("19:00");

  const updateSchedule = (key, val) => {
    setData(d => ({ ...d, sessionSchedule: { ...d.sessionSchedule, [key]: val } }));
  };

  const calculateNextSession = () => {
    const now = new Date();
    let next = new Date(now);
    const targetDay = sched.dayOfWeek;
    const diff = (targetDay - now.getDay() + 7) % 7;
    next.setDate(now.getDate() + (diff === 0 && now.getHours() >= sched.hour ? 7 : diff));
    next.setHours(sched.hour, sched.minute, 0, 0);
    if (sched.frequency === "biweekly") next.setDate(next.getDate() + 7);
    return next.toISOString();
  };

  const applySchedule = () => {
    const nextISO = calculateNextSession();
    setData(d => ({ ...d, nextSession: nextISO,
      activity: [{ time: "Just now", text: `Updated session schedule: ${dayNames[sched.dayOfWeek]}s at ${sched.hour}:${String(sched.minute).padStart(2,"0")}` }, ...d.activity].slice(0,20)
    }));
  };

  const scheduleCustom = () => {
    if (!customDate) return;
    const dt = new Date(`${customDate}T${customTime}:00`);
    setData(d => ({ ...d, nextSession: dt.toISOString(),
      activity: [{ time: "Just now", text: `Scheduled session for ${dt.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})} at ${customTime}` }, ...d.activity].slice(0,20)
    }));
    setCustomDate(""); setCustomTime("19:00");
  };

  const cancelNext = () => {
    const after = calculateNextSession();
    const skip = new Date(new Date(after).getTime() + 7*864e5);
    setData(d => ({ ...d, nextSession: skip.toISOString(),
      activity: [{ time: "Just now", text: "Cancelled next session, pushed to following week" }, ...d.activity].slice(0,20)
    }));
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div>
          <span style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Day</span>
          <Select value={sched.dayOfWeek} onChange={v=>updateSchedule("dayOfWeek",parseInt(v))} style={{ width:"100%" }}>
            {dayNames.map((d,i) => <option key={i} value={i}>{d}</option>)}
          </Select>
        </div>
        <div>
          <span style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Frequency</span>
          <Select value={sched.frequency} onChange={v=>updateSchedule("frequency",v)} style={{ width:"100%" }}>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </Select>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div>
          <span style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Hour</span>
          <Input type="number" value={sched.hour} onChange={v=>updateSchedule("hour",Math.max(0,Math.min(23,parseInt(v)||0)))} />
        </div>
        <div>
          <span style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Minute</span>
          <Input type="number" value={sched.minute} onChange={v=>updateSchedule("minute",Math.max(0,Math.min(59,parseInt(v)||0)))} />
        </div>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <CrimsonBtn onClick={applySchedule} small><Check size={12}/> Apply Schedule</CrimsonBtn>
        <CrimsonBtn onClick={cancelNext} secondary small><X size={12}/> Skip Next</CrimsonBtn>
      </div>
      <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:16 }}>
        <span style={{ fontFamily:T.ui, fontSize:9, letterSpacing:"2px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:10 }}>One-Off Session</span>
        <div style={{ display:"flex", gap:8 }}>
          <Input type="date" value={customDate} onChange={setCustomDate} style={{ flex:1 }} />
          <Input type="time" value={customTime} onChange={setCustomTime} style={{ width:100 }} />
          <CrimsonBtn onClick={scheduleCustom} secondary small><Calendar size={12}/> Set</CrimsonBtn>
        </div>
      </div>
    </div>
  );
}

// ─── PLAYER CHARACTER FORM (self-service for players) ───────────────────────

function PlayerCharacterForm({ onSubmit, existing, onCancel }) {
  const [form, setForm] = useState(existing || {
    name:"", cls:"", lv:1, hp:10, maxHp:10, ac:10, player:"", status:"healthy",
    race:"", bio:"", sheetUrl:null, sheetName:null,
  });
  const fileRef = useRef(null);

  const handleSheet = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setForm(p => ({...p, sheetUrl: url, sheetName: file.name}));
  };

  const submit = () => {
    if (!form.name.trim() || !form.player.trim()) return;
    onSubmit(form);
  };

  const classes = ["Barbarian","Bard","Cleric","Druid","Fighter","Monk","Paladin","Ranger","Rogue","Sorcerer","Warlock","Wizard","Artificer","Blood Hunter"];
  const races = ["Human","Elf","Half-Elf","Dwarf","Halfling","Gnome","Half-Orc","Tiefling","Dragonborn","Aasimar","Goliath","Tabaxi","Kenku","Firbolg","Genasi","Changeling","Warforged"];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div>
          <span style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Player Name</span>
          <Input value={form.player} onChange={v=>setForm(p=>({...p,player:v}))} placeholder="Your name" />
        </div>
        <div>
          <span style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Character Name</span>
          <Input value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} placeholder="Character name" />
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
        <div>
          <span style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Race</span>
          <Select value={form.race} onChange={v=>setForm(p=>({...p,race:v}))} style={{ width:"100%" }}>
            <option value="">Select...</option>
            {races.map(r=><option key={r} value={r}>{r}</option>)}
          </Select>
        </div>
        <div>
          <span style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Class</span>
          <Select value={form.cls} onChange={v=>setForm(p=>({...p,cls:v}))} style={{ width:"100%" }}>
            <option value="">Select...</option>
            {classes.map(c=><option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div>
          <span style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Level</span>
          <Input type="number" value={form.lv} onChange={v=>setForm(p=>({...p,lv:Math.max(1,Math.min(20,parseInt(v)||1))}))} />
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
        <div>
          <span style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>HP</span>
          <Input type="number" value={form.hp} onChange={v=>setForm(p=>({...p,hp:parseInt(v)||1,maxHp:Math.max(p.maxHp,parseInt(v)||1)}))} />
        </div>
        <div>
          <span style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Max HP</span>
          <Input type="number" value={form.maxHp} onChange={v=>setForm(p=>({...p,maxHp:parseInt(v)||1}))} />
        </div>
        <div>
          <span style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>AC</span>
          <Input type="number" value={form.ac} onChange={v=>setForm(p=>({...p,ac:parseInt(v)||10}))} />
        </div>
      </div>
      <div>
        <span style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Backstory / Notes</span>
        <Textarea value={form.bio||""} onChange={v=>setForm(p=>({...p,bio:v}))} placeholder="A brief backstory or notes about your character..." rows={3} />
      </div>
      <div>
        <span style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Character Sheet</span>
        <input type="file" ref={fileRef} style={{display:"none"}} accept=".pdf,.png,.jpg,.jpeg,.json" onChange={handleSheet} />
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <CrimsonBtn onClick={()=>fileRef.current?.click()} secondary small><Upload size={11}/> {form.sheetName ? "Replace" : "Upload Sheet"}</CrimsonBtn>
          {form.sheetName && <span style={{ fontSize:11, color:T.textDim, fontStyle:"italic" }}>{form.sheetName}</span>}
        </div>
      </div>
      <div style={{ display:"flex", gap:8, paddingTop:8, borderTop:`1px solid ${T.border}` }}>
        <CrimsonBtn onClick={submit}><Check size={12}/> {existing ? "Save Changes" : "Join Campaign"}</CrimsonBtn>
        {onCancel && <CrimsonBtn onClick={onCancel} secondary>Cancel</CrimsonBtn>}
      </div>
    </div>
  );
}

// ─── PLAYER CHARACTER CARD (compact display after joining) ──────────────────

function PlayerCard({ member, onEdit, onUploadSheet, isDm }) {
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef(null);

  const handleSheet = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    onUploadSheet(member.id, file);
  };

  return (
    <div style={{
      background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:"4px",
      boxShadow:"0 2px 8px rgba(0,0,0,0.08)", transition:"all 0.2s", overflow:"hidden",
    }}>
      <input type="file" ref={fileRef} style={{display:"none"}} accept=".pdf,.png,.jpg,.jpeg,.json" onChange={handleSheet} />
      {/* Compact header — always visible */}
      <div onClick={()=>setExpanded(!expanded)} style={{ padding:"16px 20px", cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:36, height:36, borderRadius:"50%", background:T.crimsonSoft, border:`1px solid ${T.crimsonBorder}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <span style={{ fontFamily:T.ui, fontSize:12, color:T.crimson, fontWeight:500 }}>{member.name.charAt(0)}</span>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:15, color:T.text, fontWeight:300 }}>{member.name}</span>
            <Tag variant="muted">Lv{member.lv} {member.cls}</Tag>
          </div>
          <div style={{ fontSize:11, color:T.textFaint, fontWeight:300, marginTop:2 }}>
            {member.player}{member.race ? ` — ${member.race}` : ""}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          {member.status!=="healthy" && <Tag variant={member.status==="wounded"||member.status==="dead"?"danger":"warning"}>{member.status}</Tag>}
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:11, color:member.hp<=member.maxHp*0.3?T.crimson:member.hp<=member.maxHp*0.5?"#d97706":T.textDim, fontWeight:500 }}>{member.hp}/{member.maxHp}</div>
            <div style={{ width:60 }}><HpBar val={member.hp} max={member.maxHp} color={member.hp<member.maxHp*0.3?T.crimson:member.hp<member.maxHp*0.6?"#d97706":"#2d6a4f"}/></div>
          </div>
          <span style={{ fontFamily:T.ui, fontSize:8, color:T.textFaint, letterSpacing:"1px" }}>AC {member.ac}</span>
          {expanded ? <ChevronUp size={14} color={T.textFaint}/> : <ChevronDown size={14} color={T.textFaint}/>}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding:"0 20px 20px", borderTop:`1px solid ${T.borderMid}` }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12, paddingTop:16, marginBottom:12 }}>
            {[{l:"HP",v:`${member.hp}/${member.maxHp}`},{l:"AC",v:member.ac},{l:"Level",v:member.lv},{l:"Class",v:member.cls}].map(s=>(
              <div key={s.l} style={{ textAlign:"center", background:T.bg, padding:"10px 8px", borderRadius:"2px", border:`1px solid ${T.border}` }}>
                <span style={{ fontFamily:T.ui, fontSize:7, letterSpacing:"1.5px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:4 }}>{s.l}</span>
                <span style={{ fontSize:14, color:T.crimson, fontWeight:300 }}>{s.v}</span>
              </div>
            ))}
          </div>
          {member.bio && <p style={{ fontSize:13, color:T.textDim, fontStyle:"italic", fontWeight:300, lineHeight:1.7, margin:"0 0 12px" }}>{member.bio}</p>}
          {member.sheetName && (
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12 }}>
              <FileText size={11} color={T.textFaint}/>
              <a href={member.sheetUrl} target="_blank" rel="noreferrer" style={{ fontSize:11, color:T.crimson, textDecoration:"none" }}>{member.sheetName}</a>
            </div>
          )}
          <div style={{ display:"flex", gap:6 }}>
            <CrimsonBtn onClick={()=>onEdit(member)} secondary small><Edit3 size={10}/> Edit Character</CrimsonBtn>
            <CrimsonBtn onClick={()=>fileRef.current?.click()} secondary small><Upload size={10}/> {member.sheetName?"Replace":"Upload"} Sheet</CrimsonBtn>
            {isDm && (
              <CrimsonBtn onClick={()=>onEdit({...member, _remove:true})} secondary small><Trash2 size={10}/> Remove</CrimsonBtn>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMPAIGN SELECTOR
// ═══════════════════════════════════════════════════════════════════════════

function CampaignSelector({ campaigns, activeCampaignId, onSelect, onCreate, onDelete }) {
  const [showList, setShowList] = useState(false);

  return (
    <div style={{ position:"relative" }}>
      <button onClick={()=>setShowList(!showList)} style={{
        display:"flex", alignItems:"center", gap:8, background:"transparent", border:`1px solid ${T.border}`,
        padding:"6px 14px", borderRadius:"2px", cursor:"pointer", transition:"all 0.2s",
      }}>
        <span style={{ fontSize:12, color:T.textDim, fontWeight:300 }}>{campaigns.find(c=>c.id===activeCampaignId)?.data.name || "Select Campaign"}</span>
        <ChevronDown size={12} color={T.textFaint}/>
      </button>
      {showList && (
        <div style={{
          position:"absolute", top:"100%", right:0, marginTop:4, width:280,
          background:T.bgCard, border:`1px solid ${T.crimsonBorder}`, borderRadius:"4px",
          boxShadow:"0 8px 24px rgba(0,0,0,0.4)", zIndex:300, overflow:"hidden",
        }}>
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}` }}>
            <span style={{ fontFamily:T.ui, fontSize:9, letterSpacing:"2px", color:T.crimson, textTransform:"uppercase" }}>Your Campaigns</span>
          </div>
          <div style={{ maxHeight:240, overflowY:"auto" }}>
            {campaigns.map(c => (
              <div key={c.id} onClick={()=>{onSelect(c.id);setShowList(false);}} style={{
                padding:"10px 16px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center",
                background: c.id===activeCampaignId ? T.crimsonSoft : "transparent",
                borderBottom:`1px solid ${T.borderMid}`, transition:"background 0.15s",
              }}>
                <div>
                  <div style={{ fontSize:13, color:T.text, fontWeight:300 }}>{c.data.name}</div>
                  <div style={{ fontSize:10, color:T.textFaint, fontStyle:"italic" }}>
                    {c.data.party.length} players · {c.data.sessionsPlayed} sessions
                    {c.isExample && " · Example"}
                  </div>
                </div>
                {!c.isExample && c.id !== activeCampaignId && (
                  <button onClick={e=>{e.stopPropagation();onDelete(c.id);}} style={{ background:"none", border:"none", cursor:"pointer", color:T.textFaint, padding:4 }}><Trash2 size={11}/></button>
                )}
              </div>
            ))}
          </div>
          <div onClick={()=>{onCreate();setShowList(false);}} style={{
            padding:"12px 16px", cursor:"pointer", borderTop:`1px solid ${T.border}`,
            display:"flex", alignItems:"center", gap:8, transition:"background 0.15s",
          }}>
            <Plus size={14} color={T.crimson}/>
            <span style={{ fontFamily:T.ui, fontSize:9, letterSpacing:"2px", color:T.crimson, textTransform:"uppercase" }}>New Campaign</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

function DashboardView({ data, setData, onNav }) {
  const countdown = useCountdown(data.nextSession);
  const active = data.quests.filter(q=>q.status==="active");
  const urgVar = { critical:"critical", high:"danger", medium:"warning", low:"muted" };
  const [joiningParty, setJoiningParty] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [addingQuest, setAddingQuest] = useState(false);
  const [schedOpen, setSchedOpen] = useState(false);
  const [newQuest, setNewQuest] = useState({ title:"", type:"side", status:"active", urgency:"medium", faction:"", region:"" });

  const handlePlayerSubmit = (formData) => {
    if (editingMember) {
      if (formData._remove) {
        setData(d=>({...d, party: d.party.filter(p=>p.id!==editingMember.id),
          activity:[{time:"Just now", text:`Removed ${editingMember.name} from party`},...d.activity].slice(0,20)}));
      } else {
        setData(d=>({...d, party: d.party.map(p=>p.id===editingMember.id?{...p,...formData}:p),
          activity:[{time:"Just now", text:`${formData.name} updated their character`},...d.activity].slice(0,20)}));
      }
      setEditingMember(null);
    } else {
      setData(d=>({...d, party: [...d.party, { ...formData, id:uid() }],
        activity:[{time:"Just now", text:`${formData.name} (${formData.player}) joined the party`},...d.activity].slice(0,20)}));
      setJoiningParty(false);
    }
  };
  const handleSheetUpload = (memberId, file) => {
    const url = URL.createObjectURL(file);
    setData(d=>({...d, party: d.party.map(p=>p.id===memberId?{...p,sheetUrl:url,sheetName:file.name}:p),
      activity:[{time:"Just now", text:`Character sheet uploaded for ${d.party.find(p=>p.id===memberId)?.name}`},...d.activity].slice(0,20)}));
  };
  const addQuest = () => {
    if(!newQuest.title) return;
    setData(d=>({...d, quests: [...d.quests, { ...newQuest, id:uid() }],
      activity:[{time:"Just now", text:`Added quest: ${newQuest.title}`},...d.activity].slice(0,20)}));
    setNewQuest({ title:"", type:"side", status:"active", urgency:"medium", faction:"", region:"" }); setAddingQuest(false);
  };
  const updateQuestStatus = (id, status) => {
    setData(d=>({...d, quests: d.quests.map(q=>q.id===id?{...q,status}:q),
      activity:[{time:"Just now", text:`Quest "${d.quests.find(q=>q.id===id)?.title}" marked ${status}`},...d.activity].slice(0,20)}));
  };
  const handleEdit = (member) => {
    if (member._remove) {
      setData(d=>({...d, party: d.party.filter(p=>p.id!==member.id),
        activity:[{time:"Just now", text:`Removed ${member.name} from party`},...d.activity].slice(0,20)}));
    } else {
      setEditingMember(member);
    }
  };

  const nextN = data.sessionsPlayed + 1;
  const steps = [
    { done:data.party.length>0, text:"Add party members" },
    { done:data.sessionsPlayed>0, text:"Log your first session" },
    { done:data.regions.length>0, text:"Establish world regions" },
    { done:data.factions.length>0, text:"Create factions" },
    { done:data.npcs.length>0, text:"Add NPCs to the world" },
    { done:data.nextSession, text:"Schedule your next session" },
  ];

  // ═══ CALCULATION HELPERS ═══════════════════════════════════════════════════
  const getClassIcon = (cls) => {
    const iconMap = {
      "Fighter":"Swords", "Paladin":"Swords", "Rogue":"Target", "Ranger":"Target",
      "Wizard":"Wand2", "Sorcerer":"Wand2", "Cleric":"Heart", "Druid":"Leaf",
      "Bard":"Music", "Monk":"Fist", "Barbarian":"Zap", "Warlock":"Wand2"
    };
    return iconMap[cls] || "Users";
  };

  const getStatusColor = (status) => {
    const colors = { healthy:"#6fcf97", wounded:"#d97706", poisoned:"#7c3aed", cursed:"#dc2626" };
    return colors[status] || T.textFaint;
  };

  const totalEncounters = data.timeline.reduce((sum, s) => sum + (s.events?.filter(e=>e.type==="encounter").length || 0), 0);
  const totalRoleplay = data.timeline.reduce((sum, s) => sum + (s.events?.filter(e=>e.type==="roleplay").length || 0), 0);
  const totalDiscoveries = data.timeline.reduce((sum, s) => sum + (s.events?.filter(e=>e.type==="discovery").length || 0), 0);
  const avgSessionLength = data.sessionsPlayed > 0 ? Math.round(data.timeline.reduce((sum,s) => sum + (s.events?.length || 0), 0) / data.sessionsPlayed) : 0;
  const factionQuestCounts = data.factions.reduce((acc, f) => { acc[f.name] = data.quests.filter(q=>q.faction===f.name).length; return acc; }, {});
  const mostActiveFaction = Object.entries(factionQuestCounts).sort((a,b)=>b[1]-a[1])[0];
  const regionThreats = data.regions.reduce((acc, r) => { acc[r.threat] = (acc[r.threat] || 0) + 1; return acc; }, {});
  const mostDangerRegion = data.regions.filter(r=>r.threat==="extreme"||r.threat==="high").sort((a,b)=>factionQuestCounts[b.ctrl||""]-(factionQuestCounts[a.ctrl||""]||0))[0];
  const partyAvgLvl = data.party.length > 0 ? Math.round(data.party.reduce((sum,p)=>sum+p.lv,0)/data.party.length) : 0;
  const partyTotalHp = data.party.reduce((sum,p)=>sum+p.hp,0);
  const partyMaxHp = data.party.reduce((sum,p)=>sum+p.maxHp,0);
  const partyHpPercent = partyMaxHp > 0 ? Math.round((partyTotalHp/partyMaxHp)*100) : 100;
  const completedQuests = data.quests.filter(q=>q.status==="completed");
  const lastQuestIdx = completedQuests.length > 0 ? data.quests.indexOf(completedQuests[completedQuests.length-1]) : -1;
  const sessionsSinceLastQuest = lastQuestIdx >= 0 ? Math.max(0, data.timeline.length - (lastQuestIdx)) : data.timeline.length;
  const upcoming = data.quests.filter(q=>q.status==="upcoming");
  const completed = data.quests.filter(q=>q.status==="completed").slice(-3);
  const hostileFactions = data.factions.filter(f=>f.attitude==="hostile");
  const extremeThreatRegions = data.regions.filter(r=>r.threat==="extreme"&&!r.visited);

  // Activity feed with icons
  const activityIcons = {
    "encounter":Swords, "party":Users, "quest":Scroll, "session":BookOpen,
    "discovery":Search, "faction":Crown, "region":MapPin, "npc":Users
  };
  const getActivityIcon = (text) => {
    if(text.includes("session")) return BookOpen;
    if(text.includes("quest")) return Scroll;
    if(text.includes("party")) return Users;
    if(text.includes("faction")) return Crown;
    return Activity;
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:24, padding:"32px 56px" }}>
      <div style={{ display:"flex", flexDirection:"column", gap:24 }}>

        {/* ═══ QUICK ACTIONS BAR ═══════════════════════════════════════════════ */}
        <div style={{ display:"flex", gap:12 }}>
          <button onClick={()=>onNav("timeline")} style={{
            flex:1, padding:"12px 16px", background:T.crimsonSoft, border:`1px solid ${T.crimsonBorder}`,
            borderRadius:"4px", cursor:"pointer", fontFamily:T.ui, fontSize:"10px", letterSpacing:"1px",
            color:T.crimson, textTransform:"uppercase", fontWeight:500, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            transition:"all 0.2s", boxShadow:"0 2px 4px rgba(0,0,0,0.08)"
          }}>
            <BookOpen size={12}/>New Session
          </button>
          <button onClick={()=>onNav("play")} style={{
            flex:1, padding:"12px 16px", background:T.bgCard, border:`1px solid ${T.border}`,
            borderRadius:"4px", cursor:"pointer", fontFamily:T.ui, fontSize:"10px", letterSpacing:"1px",
            color:T.text, textTransform:"uppercase", fontWeight:500, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            transition:"all 0.2s"
          }}>
            <Dice6 size={12}/>Roll Initiative
          </button>
          <button onClick={()=>onNav("world")} style={{
            flex:1, padding:"12px 16px", background:T.bgCard, border:`1px solid ${T.border}`,
            borderRadius:"4px", cursor:"pointer", fontFamily:T.ui, fontSize:"10px", letterSpacing:"1px",
            color:T.text, textTransform:"uppercase", fontWeight:500, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            transition:"all 0.2s"
          }}>
            <Users size={12}/>Quick NPC
          </button>
        </div>

        {/* Stats Row */}
        <div style={{ display:"flex", gap:20 }}>
          {[
            { label:"Sessions", value:data.sessionsPlayed },
            { label:"Party Size", value:data.party.length },
            { label:"Active Quests", value:active.length },
            { label:"Kingdoms", value:data.factions.length },
          ].map(s => (
            <div key={s.label} style={{ flex:1, background:T.bgCard, border:`1px solid ${T.crimsonBorder}`, borderRadius:"4px", padding:"16px 24px", textAlign:"center" }}>
              <span style={{ fontFamily:T.ui, fontSize:"8px", letterSpacing:"2px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:8 }}>{s.label}</span>
              <span style={{ fontSize:28, color:T.crimson, fontWeight:300 }}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Next Session + inline scheduler */}
        <Section>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <span style={{ fontFamily:T.ui, fontSize:9, letterSpacing:"2px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:12 }}>Next Session</span>
              {data.nextSession ? <>
                <div style={{ fontSize:24, color:T.crimson, fontWeight:300, marginBottom:8 }}>{countdown}</div>
                <div style={{ fontSize:13, color:T.textDim, fontStyle:"italic" }}>
                  {new Date(data.nextSession).toLocaleDateString("en-US",{ weekday:"long", month:"long", day:"numeric", hour:"numeric", minute:"2-digit" })}
                </div>
              </> : (
                <p style={{ fontSize:13, color:T.textFaint, fontStyle:"italic", fontWeight:300 }}>No session scheduled yet</p>
              )}
            </div>
            {data.modules.scheduler && (
              <button onClick={()=>setSchedOpen(!schedOpen)} style={{
                background:"none", border:`1px solid ${T.border}`,
                borderRadius:"2px", cursor:"pointer", padding:"4px 8px", display:"flex", alignItems:"center", gap:4,
                color:schedOpen?T.crimson:T.textFaint, transition:"all 0.2s", flexShrink:0,
              }}>
                <Calendar size={11}/>
                <span style={{ fontFamily:T.ui, fontSize:7, letterSpacing:"1px", textTransform:"uppercase" }}>Schedule</span>
                {schedOpen ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
              </button>
            )}
          </div>
          {schedOpen && data.modules.scheduler && (
            <div style={{ marginTop:20, paddingTop:16, borderTop:`1px solid ${T.border}` }}>
              <SessionSchedulerInline data={data} setData={setData} />
            </div>
          )}
        </Section>

        {/* ═══ CAMPAIGN STATISTICS PANEL ════════════════════════════════════════ */}
        <Section>
          <SectionTitle icon={Star}>Campaign Statistics</SectionTitle>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            <div style={{ borderLeft:`3px solid ${T.crimson}`, paddingLeft:12 }}>
              <span style={{ fontFamily:T.ui, fontSize:"8px", letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:4 }}>Combat</span>
              <span style={{ fontSize:20, color:T.text, fontWeight:300 }}>{totalEncounters}</span>
            </div>
            <div style={{ borderLeft:`3px solid ${T.crimson}`, paddingLeft:12 }}>
              <span style={{ fontFamily:T.ui, fontSize:"8px", letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:4 }}>Roleplay</span>
              <span style={{ fontSize:20, color:T.text, fontWeight:300 }}>{totalRoleplay}</span>
            </div>
            <div style={{ borderLeft:`3px solid ${T.crimson}`, paddingLeft:12 }}>
              <span style={{ fontFamily:T.ui, fontSize:"8px", letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:4 }}>Discoveries</span>
              <span style={{ fontSize:20, color:T.text, fontWeight:300 }}>{totalDiscoveries}</span>
            </div>
            <div style={{ borderLeft:`3px solid ${T.crimson}`, paddingLeft:12 }}>
              <span style={{ fontFamily:T.ui, fontSize:"8px", letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:4 }}>Avg Events</span>
              <span style={{ fontSize:20, color:T.text, fontWeight:300 }}>{avgSessionLength}</span>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, paddingTop:12, borderTop:`1px solid ${T.border}` }}>
            <div>
              <span style={{ fontFamily:T.ui, fontSize:"8px", letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Most Active Faction</span>
              {mostActiveFaction ? (
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:13, color:T.text, fontWeight:300 }}>{mostActiveFaction[0]}</span>
                  <Tag variant="info">{mostActiveFaction[1]} quests</Tag>
                </div>
              ) : (
                <span style={{ fontSize:12, color:T.textFaint, fontStyle:"italic" }}>None yet</span>
              )}
            </div>
            <div>
              <span style={{ fontFamily:T.ui, fontSize:"8px", letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Danger Zone</span>
              {mostDangerRegion ? (
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:13, color:T.text, fontWeight:300 }}>{mostDangerRegion.name}</span>
                  <Tag variant="danger">{mostDangerRegion.threat}</Tag>
                </div>
              ) : (
                <span style={{ fontSize:12, color:T.textFaint, fontStyle:"italic" }}>None yet</span>
              )}
            </div>
            <div>
              <span style={{ fontFamily:T.ui, fontSize:"8px", letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Party Avg Level</span>
              <span style={{ fontSize:14, color:T.crimson, fontWeight:300 }}>Level {partyAvgLvl}</span>
            </div>
            <div>
              <span style={{ fontFamily:T.ui, fontSize:"8px", letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Party Health</span>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ flex:1, height:8, background:T.bgMid, borderRadius:"2px", overflow:"hidden" }}>
                  <div style={{ height:"100%", background:partyHpPercent>50?T.crimson:partyHpPercent>25?"#d97706":"#dc2626", width:`${partyHpPercent}%`, transition:"all 0.3s" }}/>
                </div>
                <span style={{ fontSize:11, color:T.textMuted, minWidth:40 }}>{partyHpPercent}%</span>
              </div>
            </div>
          </div>
          {sessionsSinceLastQuest > 0 && (
            <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${T.border}` }}>
              <span style={{ fontFamily:T.ui, fontSize:"8px", letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Sessions Since Quest Complete</span>
              <span style={{ fontSize:13, color:T.textDim, fontWeight:300 }}>{sessionsSinceLastQuest} sessions</span>
            </div>
          )}
        </Section>

        {/* ═══ PARTY OVERVIEW GRID ══════════════════════════════════════════════ */}
        <div>
          <SectionTitle icon={Users} count={data.party.length} action={
            <div style={{ display:"flex", gap:8 }}>
              <LinkBtn onClick={()=>setJoiningParty(true)}><Plus size={10}/> Join Party</LinkBtn>
              <LinkBtn onClick={()=>onNav("play")}>Play Mode <ArrowRight size={10}/></LinkBtn>
            </div>
          }>The Party</SectionTitle>

          {data.party.length === 0 && !joiningParty && (
            <Section style={{ textAlign:"center", padding:32 }}>
              <Users size={28} color={T.textFaint} style={{marginBottom:12}}/>
              <p style={{ fontSize:14, color:T.textMuted, fontStyle:"italic", fontWeight:300, marginBottom:16 }}>No adventurers yet. Players can join and create their characters.</p>
              <CrimsonBtn onClick={()=>setJoiningParty(true)}><Plus size={12}/> Create Your Character</CrimsonBtn>
            </Section>
          )}

          {data.party.length > 0 && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
              {data.party.map(p => {
                const hpPercent = p.maxHp > 0 ? Math.round((p.hp/p.maxHp)*100) : 100;
                const ClassIcon = getClassIcon(p.cls);
                return (
                  <div key={p.id} onClick={()=>setEditingMember(p)} style={{
                    background:T.bgCard, border:`2px solid ${T.border}`, borderRadius:"6px", padding:"16px",
                    cursor:"pointer", transition:"all 0.2s", boxShadow:"0 2px 8px rgba(0,0,0,0.08)"
                  }} onMouseEnter={e=>e.currentTarget.style.borderColor=T.crimson} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"start", marginBottom:8 }}>
                      <div>
                        <div style={{ fontSize:14, color:T.text, fontWeight:300, marginBottom:2 }}>{p.name}</div>
                        <div style={{ fontSize:11, color:T.textMuted, fontStyle:"italic" }}>{p.race} {p.cls}</div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                        <Shield size={12} color={T.textMuted}/>
                        <span style={{ fontSize:11, color:T.textMuted }}>{p.ac}</span>
                      </div>
                    </div>
                    {p.bio && (
                      <p style={{ fontSize:11, color:T.textFaint, fontStyle:"italic", marginBottom:8, lineHeight:1.4 }}>{p.bio.substring(0,50)}...</p>
                    )}
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ height:6, background:T.bgMid, borderRadius:"2px", overflow:"hidden", marginBottom:2 }}>
                          <div style={{ height:"100%", background:getStatusColor(p.status), width:`${hpPercent}%`, transition:"all 0.3s" }}/>
                        </div>
                        <span style={{ fontSize:9, color:T.textMuted }}>{p.hp}/{p.maxHp} HP ({hpPercent}%)</span>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <div style={{ width:20, height:20, background:getStatusColor(p.status), borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <span style={{ fontSize:10, color:"white", fontWeight:"bold" }}>{p.lv}</span>
                      </div>
                      <Tag variant={p.status==="healthy"?"success":p.status==="poisoned"?"danger":p.status==="wounded"?"warning":"muted"}>{p.status}</Tag>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {data.party.map(p => (
              <PlayerCard key={p.id} member={p} onEdit={handleEdit} onUploadSheet={handleSheetUpload} isDm={true} />
            ))}
          </div>
        </div>

        {/* Join Party / Edit Character Modal */}
        <Modal open={joiningParty || editingMember !== null} onClose={()=>{setJoiningParty(false);setEditingMember(null);}} title={editingMember ? "Edit Character" : "Join the Party"} wide>
          <PlayerCharacterForm
            existing={editingMember}
            onSubmit={handlePlayerSubmit}
            onCancel={()=>{setJoiningParty(false);setEditingMember(null);}}
          />
        </Modal>

        {/* ═══ FACTION STANDING CHART ════════════════════════════════════════ */}
        {data.modules.factionTracker && data.factions.length > 0 && (
          <Section>
            <SectionTitle icon={Crown}>Faction Power Levels</SectionTitle>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {data.factions.map(f => (
                <div key={f.id}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:8, height:8, background:f.color, borderRadius:"50%" }}/>
                      <span style={{ fontSize:12, color:T.text, fontWeight:300 }}>{f.name}</span>
                      {f.trend==="rising"?<TrendingUp size={10} color={T.crimson}/>:f.trend==="declining"?<TrendingDown size={10} color="#6fcf97"/>:<Minus size={10} color={T.textFaint}/>}
                    </div>
                    <Tag variant={f.attitude==="allied"||f.attitude==="friendly"?"success":f.attitude==="hostile"?"danger":"muted"}>{f.attitude}</Tag>
                  </div>
                  <PowerBar val={f.power} max={100} color={f.color} />
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ═══ QUEST PIPELINE ════════════════════════════════════════════════════ */}
        {data.modules.questTracker && (
          <div>
            <SectionTitle icon={Scroll} action={<LinkBtn onClick={()=>setAddingQuest(true)}><Plus size={10}/> Add Quest</LinkBtn>}>Quest Pipeline</SectionTitle>
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {/* Active */}
              {active.length > 0 && (
                <div>
                  <span style={{ fontFamily:T.ui, fontSize:"8px", letterSpacing:"2px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:8 }}>Active Quests</span>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {active.map(q => (
                      <div key={q.id} style={{
                        background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:"4px", padding:"12px 14px",
                        borderLeft:`3px solid ${q.urgency==="critical"?T.crimson:q.urgency==="high"?"#d97706":"#d4a843"}`,
                      }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                          <span style={{ fontSize:13, color:T.text, fontWeight:300 }}>{q.title}</span>
                          <Tag variant={urgVar[q.urgency]}>{q.urgency}</Tag>
                        </div>
                        <div style={{ display:"flex", gap:8, fontSize:10, color:T.textFaint }}>
                          {q.region && <span><MapPin size={9}/> {q.region}</span>}
                          {q.faction && <span><Flag size={9}/> {q.faction}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Upcoming */}
              {upcoming.length > 0 && (
                <div>
                  <span style={{ fontFamily:T.ui, fontSize:"8px", letterSpacing:"2px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:8 }}>Upcoming</span>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {upcoming.map(q => (
                      <div key={q.id} style={{ fontSize:12, color:T.textDim, padding:"8px 12px", background:T.bgMid, borderRadius:"3px" }}>
                        {q.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Completed */}
              {completed.length > 0 && (
                <div>
                  <span style={{ fontFamily:T.ui, fontSize:"8px", letterSpacing:"2px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:8 }}>Recently Completed</span>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {completed.map(q => (
                      <div key={q.id} style={{ fontSize:11, color:T.textFaint, textDecoration:"line-through" }}>
                        <CheckCircle size={8} style={{display:"inline", marginRight:6}} color="#6fcf97"/> {q.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Quest Modal */}
        <Modal open={addingQuest} onClose={()=>setAddingQuest(false)} title="Add Quest">
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <Input value={newQuest.title} onChange={v=>setNewQuest(p=>({...p,title:v}))} placeholder="Quest Title" />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Select value={newQuest.type} onChange={v=>setNewQuest(p=>({...p,type:v}))} style={{ width:"100%" }}>
                <option value="main">Main Quest</option>
                <option value="side">Side Quest</option>
              </Select>
              <Select value={newQuest.urgency} onChange={v=>setNewQuest(p=>({...p,urgency:v}))} style={{ width:"100%" }}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </div>
            <Input value={newQuest.region} onChange={v=>setNewQuest(p=>({...p,region:v}))} placeholder="Region" />
            <Input value={newQuest.faction} onChange={v=>setNewQuest(p=>({...p,faction:v}))} placeholder="Related Faction" />
            <CrimsonBtn onClick={addQuest}><Plus size={12}/> Add Quest</CrimsonBtn>
          </div>
        </Modal>

        {/* ═══ WORLD THREAT HEATMAP ═════════════════════════════════════════════ */}
        {data.modules.worldState && data.regions.length > 0 && (
          <Section>
            <SectionTitle icon={Skull}>World Threat Assessment</SectionTitle>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <span style={{ fontFamily:T.ui, fontSize:"8px", letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Regions by Threat</span>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
                  {["extreme", "high", "medium", "low"].map(level => (
                    <div key={level} style={{ background:T.bgMid, borderRadius:"4px", padding:"8px 12px", textAlign:"center" }}>
                      <div style={{ fontSize:18, color:level==="extreme"?T.crimson:level==="high"?"#d97706":"#d4a843", fontWeight:300, marginBottom:2 }}>{regionThreats[level]||0}</div>
                      <div style={{ fontSize:9, color:T.textMuted, textTransform:"capitalize" }}>{level}</div>
                    </div>
                  ))}
                </div>
              </div>
              {hostileFactions.length > 0 && (
                <div style={{ paddingTop:12, borderTop:`1px solid ${T.border}` }}>
                  <span style={{ fontFamily:T.ui, fontSize:"8px", letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Hostile Factions</span>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {hostileFactions.map(f => (
                      <div key={f.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:11 }}>
                        <span style={{ color:T.text }}>{f.name}</span>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ color:T.textMuted }}>PWR {f.power}</span>
                          <div style={{ width:3, height:3, background:f.color, borderRadius:"50%" }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {extremeThreatRegions.length > 0 && (
                <div style={{ paddingTop:12, borderTop:`1px solid ${T.border}`, padding:"12px 12px 0" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", background:"rgba(220,38,38,0.08)", borderRadius:"3px", border:`1px solid ${T.crimson}` }}>
                    <AlertTriangle size={12} color={T.crimson}/>
                    <span style={{ fontSize:11, color:T.crimson, fontWeight:300 }}>Unvisited extreme threat regions detected</span>
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Factions (old grid layout) */}
        {data.modules.factionTracker && (
          <div>
            <SectionTitle icon={Globe} action={<LinkBtn onClick={()=>onNav("world")}>World State <ArrowRight size={10}/></LinkBtn>}>Factions</SectionTitle>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              {data.factions.map(f => (
                <div key={f.id} style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:"4px", padding:"16px 20px", borderLeft:`3px solid ${f.color}`, boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <span style={{ fontSize:14, color:T.text, fontWeight:300 }}>{f.name}</span>
                    {f.trend==="rising"?<TrendingUp size={12} color={T.crimson}/>:f.trend==="declining"?<TrendingDown size={12} color="#6fcf97"/>:<Minus size={12} color={T.textFaint}/>}
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <Tag variant={f.attitude==="allied"||f.attitude==="friendly"?"success":f.attitude==="hostile"?"danger":"muted"}>{f.attitude}</Tag>
                    <span style={{ fontFamily:T.ui, fontSize:8, color:T.textFaint, letterSpacing:"1px" }}>PWR {f.power}</span>
                  </div>
                  <PowerBar val={f.power} max={100} color={f.color} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR */}
      <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
        <Section>
          <SectionTitle icon={Compass}>What's Next</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {steps.map((s,i) => (
              <div key={i} style={{ display:"flex", alignItems:"start", gap:10, opacity:s.done?0.4:1 }}>
                {s.done ? <CheckCircle size={14} color="#6fcf97" style={{marginTop:2,flexShrink:0}}/> : <Circle size={14} color={T.crimson} style={{marginTop:2,flexShrink:0}}/>}
                <span style={{ fontSize:13, fontFamily:T.body, fontWeight:300, color:s.done?T.textFaint:T.textDim, textDecoration:s.done?"line-through":"none" }}>{s.text}</span>
              </div>
            ))}
          </div>
        </Section>

        {data.modules.timeline && (
          <Section>
            <SectionTitle icon={BookOpen}>Latest Session</SectionTitle>
            {data.timeline.length > 0 ? <>
              <span style={{ fontFamily:T.ui, fontSize:9, letterSpacing:"1px", color:T.crimson, fontWeight:500 }}>#{data.timeline[0].n}</span>
              <div style={{ fontSize:18, color:T.text, fontWeight:300, margin:"6px 0 4px" }}>{data.timeline[0].title}</div>
              <div style={{ fontSize:12, color:T.textMuted, fontStyle:"italic", marginBottom:12, fontWeight:300 }}>{data.timeline[0].date}</div>
              <p style={{ fontSize:13, color:T.textDim, lineHeight:1.7, margin:"0 0 12px", fontWeight:300 }}>{data.timeline[0].summary}</p>
              <button onClick={()=>onNav("timeline")} style={{
                width:"100%", padding:10, background:T.crimsonSoft, border:`1px solid ${T.crimsonBorder}`,
                borderRadius:"2px", cursor:"pointer", fontFamily:T.ui, fontSize:"9px", letterSpacing:"2px",
                color:T.crimson, textTransform:"uppercase", fontWeight:500, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              }}>View Timeline <ArrowRight size={10}/></button>
            </> : <p style={{ fontSize:13, color:T.textFaint, fontStyle:"italic" }}>No sessions logged yet.</p>}
          </Section>
        )}

        {/* ═══ ENHANCED RECENT ACTIVITY FEED ═══════════════════════════════════ */}
        <Section>
          <SectionTitle icon={Activity}>Recent Activity</SectionTitle>
          {data.activity.slice(0,8).map((a,i) => {
            const ActivityIcon = getActivityIcon(a.text);
            return (
              <div key={i} style={{ display:"flex", gap:10, padding:"10px 0", borderBottom:i<7?`1px solid ${T.borderMid}`:"none", alignItems:"flex-start" }}>
                <ActivityIcon size={12} color={T.textFaint} style={{marginTop:2, flexShrink:0}}/>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:12, fontFamily:T.body, color:T.textDim, lineHeight:1.5, fontWeight:300 }}>{a.text}</span>
                  <span style={{ fontFamily:T.ui, fontSize:8, color:T.textFaint, marginTop:2, display:"block" }}>{a.time}</span>
                </div>
              </div>
            );
          })}
        </Section>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE
// ═══════════════════════════════════════════════════════════════════════════

function TimelineView({ data, setData }) {
  // ── Core UI State ──
  const [open,setOpen] = useState(new Set([data.timeline[0]?.id]));
  const [dmView,setDmView] = useState(true);
  const [addingSession, setAddingSession] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [addingEvent, setAddingEvent] = useState(null);
  const [newSession, setNewSession] = useState({ title:"", date:new Date().toISOString().split('T')[0], summary:"", dmOnly:false, newEvents:[] });
  const [newEvent, setNewEvent] = useState({ type:"encounter", text:"", outcome:"", dmOnly:false });
  const [editNotes, setEditNotes] = useState({});

  // ── Enhanced Filtering State ──
  const [searchText, setSearchText] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState([]);
  const [dmOnlyFilter, setDmOnlyFilter] = useState(null); // null=all, true=dmOnly, false=public
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([null, null]);

  // ── Constants ──
  const evIcons = { encounter:Swords, discovery:Search, roleplay:Users, world_change:Globe, loot:Star, quest_complete:CheckCircle };
  const evCols = { encounter:"#8b0000", discovery:"#1a6b3a", roleplay:"#7a6b0d", world_change:"#2a4a6b", loot:"#7a6b0d", quest_complete:"#3d5a1e" };
  const eventTypes = ["encounter","discovery","roleplay","world_change","loot","quest_complete"];

  // ── Toggle & Helper Functions ──
  const toggle = id => setOpen(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });

  // ── Session Management ──
  const addSession = () => {
    if (!newSession.title || !newSession.date) return;
    const n = data.timeline.length > 0 ? Math.max(...data.timeline.map(s=>s.n)) + 1 : 1;
    const events = newSession.newEvents || [];
    const session = { id:uid(), n, title:newSession.title, date:newSession.date, summary:newSession.summary, events, changes:[], notes:"", dmOnly:newSession.dmOnly };
    setData(d=>({...d, timeline:[session,...d.timeline], sessionsPlayed:d.sessionsPlayed+1,
      activity:[{time:"Just now",text:`Added session ${n}: ${newSession.title}`},...d.activity].slice(0,20)}));
    setNewSession({ title:"", date:new Date().toISOString().split('T')[0], summary:"", dmOnly:false, newEvents:[] });
    setAddingSession(false);
  };

  const deleteSession = (id) => {
    setData(d=>({...d, timeline:d.timeline.filter(s=>s.id!==id),
      activity:[{time:"Just now",text:"Removed a session from timeline"},...d.activity].slice(0,20)}));
  };

  const addEvent = (sessionId) => {
    if (!newEvent.text) return;
    const ev = { id:eid(), ...newEvent };
    setData(d=>({...d, timeline:d.timeline.map(s=>s.id===sessionId?{...s,events:[...s.events,ev]}:s)}));
    setNewEvent({ type:"encounter", text:"", outcome:"", dmOnly:false });
    setAddingEvent(null);
  };

  const addEventToNewSession = () => {
    if (!newEvent.text) return;
    const ev = { id:eid(), ...newEvent };
    setNewSession(p => ({...p, newEvents:[...p.newEvents, ev]}));
    setNewEvent({ type:"encounter", text:"", outcome:"", dmOnly:false });
  };

  const removeNewEvent = (idx) => {
    setNewSession(p => ({...p, newEvents:p.newEvents.filter((_, i) => i !== idx)}));
  };

  const toggleEventDmOnly = (sessionId, eventId) => {
    setData(d=>({...d, timeline:d.timeline.map(s=>s.id===sessionId?{...s,events:s.events.map(e=>e.id===eventId?{...e,dmOnly:!e.dmOnly}:e)}:s)}));
  };

  const deleteEvent = (sessionId, eventId) => {
    setData(d=>({...d, timeline:d.timeline.map(s=>s.id===sessionId?{...s,events:s.events.filter(e=>e.id!==eventId)}:s)}));
  };

  const toggleSessionDmOnly = (id) => {
    setData(d=>({...d, timeline:d.timeline.map(s=>s.id===id?{...s,dmOnly:!s.dmOnly}:s)}));
  };

  const updateSessionNotes = (id, notes) => {
    setData(d=>({...d, timeline:d.timeline.map(s=>s.id===id?{...s,notes}:s)}));
  };

  const addWorldChange = (sessionId, text) => {
    if (!text) return;
    setData(d=>({...d, timeline:d.timeline.map(s=>s.id===sessionId?{...s,changes:[...s.changes,text]}:s)}));
  };

  // ── Advanced Filtering Logic ──
  const matchesSearch = (session) => {
    if (!searchText) return true;
    const lower = searchText.toLowerCase();
    return session.title.toLowerCase().includes(lower) ||
           session.summary.toLowerCase().includes(lower) ||
           session.events.some(e => e.text.toLowerCase().includes(lower));
  };

  const matchesEventTypeFilter = (session) => {
    if (eventTypeFilter.length === 0) return true;
    return session.events.some(e => eventTypeFilter.includes(e.type));
  };

  const matchesDmOnlyFilter = (session) => {
    if (dmOnlyFilter === null) return true;
    if (dmOnlyFilter === true) return session.dmOnly;
    return !session.dmOnly;
  };

  const matchesDateRange = (session) => {
    if (!dateRange.start && !dateRange.end) return true;
    const sDate = new Date(session.date);
    if (dateRange.start && sDate < new Date(dateRange.start)) return false;
    if (dateRange.end && sDate > new Date(dateRange.end)) return false;
    return true;
  };

  const filteredTimeline = data.timeline.filter(s => {
    if (!dmView && s.dmOnly) return false;
    if (!matchesSearch(s)) return false;
    if (!matchesEventTypeFilter(s)) return false;
    if (!matchesDmOnlyFilter(s)) return false;
    if (!matchesDateRange(s)) return false;
    return true;
  });

  // ── Session Statistics ──
  const sessionStats = {
    total: data.timeline.length,
    encounters: data.timeline.reduce((sum, s) => sum + s.events.filter(e => e.type === "encounter").length, 0),
    discoveries: data.timeline.reduce((sum, s) => sum + s.events.filter(e => e.type === "discovery").length, 0),
    loot: data.timeline.reduce((sum, s) => sum + s.events.filter(e => e.type === "loot").length, 0),
    avgEventsPerSession: data.timeline.length > 0 ? Math.round(data.timeline.reduce((sum, s) => sum + s.events.length, 0) / data.timeline.length * 10) / 10 : 0,
  };

  const eventTypeCounts = eventTypes.reduce((acc, type) => {
    acc[type] = data.timeline.reduce((sum, s) => sum + s.events.filter(e => e.type === type).length, 0);
    return acc;
  }, {});

  const mostCommonEventType = Object.entries(eventTypeCounts).sort(([,a], [,b]) => b - a)[0]?.[0] || "none";

  // ── Campaign Arc Detection (sessions with related quests) ──
  const detectArcs = () => {
    const arcs = [];
    let currentArc = [];
    let arcLabel = "";
    data.timeline.forEach((s, idx) => {
      const questEvents = s.events.filter(e => e.type === "quest_complete");
      if (questEvents.length > 0 || s.changes.length > 0) {
        currentArc.push(idx);
        arcLabel = questEvents[0]?.text || s.changes[0] || "Arc";
      } else if (currentArc.length > 0 && idx - currentArc[currentArc.length - 1] > 3) {
        if (currentArc.length >= 2) arcs.push({ label: arcLabel, sessions: [...currentArc] });
        currentArc = [];
      }
    });
    if (currentArc.length >= 2) arcs.push({ label: arcLabel, sessions: currentArc });
    return arcs;
  };

  const arcs = detectArcs();
  const arcMap = {};
  arcs.forEach((arc, idx) => {
    arc.sessions.forEach(sIdx => {
      arcMap[data.timeline[sIdx]?.id] = { label: arc.label, num: idx + 1 };
    });
  });

  // ── Visual Timeline Helper ──
  const getSessionColor = (session) => {
    const encounters = session.events.filter(e => e.type === "encounter").length;
    if (encounters >= 3) return "#8b0000";
    if (encounters >= 2) return "#c73c1d";
    if (encounters >= 1) return "#d97706";
    return T.textFaint;
  };

  const getEventTypeBreakdown = (session) => {
    const total = session.events.length;
    if (total === 0) return [];
    return eventTypes.map(type => ({
      type,
      count: session.events.filter(e => e.type === type).length,
      pct: (session.events.filter(e => e.type === type).length / total) * 100
    })).filter(x => x.count > 0);
  };

  return (
    <div style={{ padding:"32px 40px", maxWidth:1400, margin:"0 auto" }}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER & CONTROLS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24, paddingBottom:20, borderBottom:`1px solid ${T.crimsonBorder}` }}>
        <div>
          <div style={{ fontSize:42, color:T.text, fontWeight:300, marginBottom:8 }}>Campaign Timeline</div>
          <p style={{ fontSize:13, color:T.textMuted, fontStyle:"italic", margin:0, fontWeight:300 }}>
            {filteredTimeline.length} of {data.timeline.length} sessions — {data.timeline.reduce((s, x) => s + x.events.length, 0)} total events
          </p>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", justifyContent:"flex-end" }}>
          <div onClick={()=>setDmView(!dmView)} style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", padding:"6px 12px", background:dmView?T.crimsonSoft:"transparent", border:`1px solid ${dmView?T.crimsonBorder:T.border}`, borderRadius:"2px" }}>
            {dmView ? <Eye size={12} color={T.crimson}/> : <EyeOff size={12} color={T.textFaint}/>}
            <span style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:dmView?T.crimson:T.textFaint, textTransform:"uppercase" }}>DM View</span>
          </div>
          <CrimsonBtn onClick={()=>setCompareMode(!compareMode)} secondary small>
            <Eye size={11}/> {compareMode ? "Stop Comparing" : "Compare"}
          </CrimsonBtn>
          <CrimsonBtn onClick={()=>setAddingSession(true)}><Plus size={13}/> New Session</CrimsonBtn>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ADVANCED FILTERS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:"4px", padding:16, marginBottom:24 }}>
        <div style={{ fontSize:12, fontWeight:500, color:T.textMuted, textTransform:"uppercase", marginBottom:12, letterSpacing:"1px" }}>Filters</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12, marginBottom:12 }}>
          <Input
            value={searchText}
            onChange={setSearchText}
            placeholder="Search sessions, events..."
            style={{ fontSize:11 }}
          />
          <Input
            type="date"
            value={dateRange.start}
            onChange={v => setDateRange(p => ({...p, start:v}))}
            placeholder="From date"
            style={{ fontSize:11 }}
          />
          <Input
            type="date"
            value={dateRange.end}
            onChange={v => setDateRange(p => ({...p, end:v}))}
            placeholder="To date"
            style={{ fontSize:11 }}
          />
          <Select value={dmOnlyFilter === null ? "all" : dmOnlyFilter ? "dmonly" : "public"} onChange={v => setDmOnlyFilter(v==="all"?null:v==="dmonly")} style={{ fontSize:10 }}>
            <option value="all">All Visibility</option>
            <option value="dmonly">DM Only</option>
            <option value="public">Public</option>
          </Select>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {eventTypes.map(type => (
            <button
              key={type}
              onClick={() => setEventTypeFilter(p => p.includes(type) ? p.filter(t => t !== type) : [...p, type])}
              style={{
                padding:"6px 12px",
                fontSize:10,
                fontWeight:500,
                borderRadius:"2px",
                border:`1px solid ${eventTypeFilter.includes(type) ? T.crimsonBorder : T.border}`,
                background:eventTypeFilter.includes(type) ? T.crimsonSoft : T.bg,
                color:eventTypeFilter.includes(type) ? T.crimson : T.textMuted,
                cursor:"pointer",
                textTransform:"uppercase",
                letterSpacing:"0.5px",
                transition:"all 0.2s"
              }}
            >
              {type.replace("_"," ")}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VISUAL TIMELINE BAR */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {data.timeline.length > 0 && (
        <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:"4px", padding:16, marginBottom:24, overflowX:"auto" }}>
          <div style={{ fontSize:10, fontWeight:500, color:T.textMuted, textTransform:"uppercase", marginBottom:12, letterSpacing:"1px" }}>Timeline Overview</div>
          <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:"100%", paddingBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:4, paddingRight:16, borderRight:`1px solid ${T.border}` }}>
              {data.timeline.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => { toggle(s.id); document.getElementById(`session-${s.id}`)?.scrollIntoView({ behavior:"smooth" }); }}
                  title={`${s.title} (${s.events.length} events)`}
                  style={{
                    width:20,
                    height:20,
                    borderRadius:"50%",
                    border:`2px solid ${T.border}`,
                    background:getSessionColor(s),
                    cursor:"pointer",
                    display:"flex",
                    alignItems:"center",
                    justifyContent:"center",
                    fontSize:8,
                    fontWeight:600,
                    color:T.bg,
                    transition:"all 0.2s",
                    boxShadow:open.has(s.id)?`0 0 8px ${getSessionColor(s)}`:"none"
                  }}
                >
                  {s.n}
                </button>
              ))}
            </div>
            <div style={{ fontSize:10, color:T.textMuted }}>
              Color intensity = encounter density
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SESSION STATISTICS SIDEBAR */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:24, marginBottom:32 }}>
        <div></div>
        <div style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:"4px", padding:16, height:"fit-content", position:"sticky", top:20 }}>
          <div style={{ fontSize:11, fontWeight:600, color:T.text, textTransform:"uppercase", letterSpacing:"1px", marginBottom:16, paddingBottom:12, borderBottom:`1px solid ${T.border}` }}>
            Campaign Stats
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:T.textMuted }}>Total Sessions</span>
              <span style={{ fontSize:14, fontWeight:600, color:T.crimson }}>{sessionStats.total}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:T.textMuted }}>Encounters</span>
              <span style={{ fontSize:14, fontWeight:600, color:"#8b0000" }}>{sessionStats.encounters}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:T.textMuted }}>Discoveries</span>
              <span style={{ fontSize:14, fontWeight:600, color:"#1a6b3a" }}>{sessionStats.discoveries}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:T.textMuted }}>Loot Events</span>
              <span style={{ fontSize:14, fontWeight:600, color:"#7a6b0d" }}>{sessionStats.loot}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:T.textMuted }}>Avg per Session</span>
              <span style={{ fontSize:14, fontWeight:600, color:T.text }}>{sessionStats.avgEventsPerSession}</span>
            </div>
            <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:12, marginTop:12 }}>
              <div style={{ fontSize:10, color:T.textMuted, marginBottom:8 }}>Most Common Event</div>
              <div style={{ fontSize:12, fontWeight:500, color:evCols[mostCommonEventType], textTransform:"capitalize" }}>
                {mostCommonEventType.replace("_"," ")}
              </div>
            </div>
            {arcs.length > 0 && (
              <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:12, marginTop:12 }}>
                <div style={{ fontSize:10, color:T.textMuted, marginBottom:8 }}>Campaign Arcs</div>
                {arcs.slice(0, 3).map((arc, idx) => (
                  <div key={idx} style={{ fontSize:10, color:T.textDim, marginBottom:4 }}>
                    <span style={{ fontWeight:500 }}>Arc {arc.num}:</span> {arc.label.substring(0, 20)}...
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ADD SESSION MODAL WITH ENHANCED FORM */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal open={addingSession} onClose={()=>setAddingSession(false)} title="Log New Session">
        <div style={{ display:"flex", flexDirection:"column", gap:12, maxHeight:"80vh", overflowY:"auto" }}>
          {/* Session Details */}
          <div>
            <div style={{ fontSize:10, fontWeight:600, color:T.textMuted, textTransform:"uppercase", marginBottom:8, letterSpacing:"1px" }}>Session Details</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <Input
                value={newSession.title}
                onChange={v=>setNewSession(p=>({...p,title:v}))}
                placeholder="Session Title"
                style={{ fontSize:12 }}
              />
              <div style={{ display:"flex", gap:8 }}>
                <Input
                  type="date"
                  value={newSession.date}
                  onChange={v=>setNewSession(p=>({...p,date:v}))}
                  style={{ flex:1, fontSize:12 }}
                />
                <span style={{ fontSize:11, color:T.textMuted, alignSelf:"center", padding:"6px 0" }}>
                  #{data.timeline.length + 1}
                </span>
              </div>
              <Textarea
                value={newSession.summary}
                onChange={v=>setNewSession(p=>({...p,summary:v}))}
                placeholder="Session summary..."
                rows={3}
                style={{ fontSize:11 }}
              />
              <ToggleSwitch
                on={newSession.dmOnly}
                onToggle={()=>setNewSession(p=>({...p,dmOnly:!p.dmOnly}))}
                label="DM Only (hidden from players)"
              />
            </div>
          </div>

          {/* Quick Event Editor */}
          <div>
            <div style={{ fontSize:10, fontWeight:600, color:T.textMuted, textTransform:"uppercase", marginBottom:8, letterSpacing:"1px" }}>Add Events</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, background:T.bg, padding:12, borderRadius:"2px", border:`1px solid ${T.border}` }}>
              <Select
                value={newEvent.type}
                onChange={v=>setNewEvent(p=>({...p,type:v}))}
                style={{ width:"100%", fontSize:10 }}
              >
                {eventTypes.map(t=><option key={t} value={t}>{t.replace("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
              </Select>
              <Input
                value={newEvent.text}
                onChange={v=>setNewEvent(p=>({...p,text:v}))}
                placeholder="What happened..."
                style={{ fontSize:11 }}
              />
              <Input
                value={newEvent.outcome}
                onChange={v=>setNewEvent(p=>({...p,outcome:v}))}
                placeholder="Outcome..."
                style={{ fontSize:11 }}
              />
              <ToggleSwitch
                on={newEvent.dmOnly}
                onToggle={()=>setNewEvent(p=>({...p,dmOnly:!p.dmOnly}))}
                label="DM Only"
              />
              <CrimsonBtn onClick={addEventToNewSession} secondary small style={{ alignSelf:"flex-start" }}>
                <Plus size={10}/> Add Event
              </CrimsonBtn>
            </div>
          </div>

          {/* Event Preview */}
          {newSession.newEvents.length > 0 && (
            <div>
              <div style={{ fontSize:10, fontWeight:600, color:T.textMuted, textTransform:"uppercase", marginBottom:8, letterSpacing:"1px" }}>
                Events Preview ({newSession.newEvents.length})
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {newSession.newEvents.map((ev, idx) => {
                  const Icon = evIcons[ev.type] || Circle;
                  return (
                    <div
                      key={idx}
                      style={{
                        background:T.bgHover,
                        border:`1px solid ${T.border}`,
                        borderRadius:"2px",
                        padding:10,
                        display:"flex",
                        gap:8,
                        alignItems:"start",
                        opacity:ev.dmOnly?0.7:1
                      }}
                    >
                      <Icon size={12} color={evCols[ev.type]} style={{marginTop:2, flexShrink:0}} />
                      <div style={{ flex:1, fontSize:11 }}>
                        <div style={{ color:T.text, fontWeight:500, marginBottom:2 }}>{ev.text}</div>
                        <div style={{ fontSize:10, color:T.textMuted }}>→ {ev.outcome}</div>
                      </div>
                      <button
                        onClick={() => removeNewEvent(idx)}
                        style={{ background:"none", border:"none", cursor:"pointer", color:T.textFaint, padding:2 }}
                      >
                        <Trash2 size={11}/>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display:"flex", gap:8, paddingTop:12, borderTop:`1px solid ${T.border}` }}>
            <CrimsonBtn onClick={addSession} style={{ flex:1 }}>
              <Plus size={12}/> Log Session
            </CrimsonBtn>
            <CrimsonBtn onClick={()=>setAddingSession(false)} secondary style={{ flex:1 }}>
              Cancel
            </CrimsonBtn>
          </div>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SESSIONS LIST - ENHANCED CARDS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ position:"relative" }}>
        <div style={{ position:"absolute", left:15, top:0, bottom:0, width:2, background:T.crimsonBorder }} />

        {filteredTimeline.length === 0 && (
          <div style={{ textAlign:"center", padding:40, color:T.textMuted }}>
            <div style={{ fontSize:14, marginBottom:8 }}>No sessions match your filters</div>
            <button
              onClick={() => { setSearchText(""); setEventTypeFilter([]); setDmOnlyFilter(null); setDateRange({start:"",end:""}); }}
              style={{ fontSize:11, color:T.crimson, background:"none", border:"none", cursor:"pointer", textDecoration:"underline" }}
            >
              Clear all filters
            </button>
          </div>
        )}

        {filteredTimeline.map((s, idx) => {
          const isOpen = open.has(s.id);
          const latest = idx===0;
          const arc = arcMap[s.id];
          const breakdown = getEventTypeBreakdown(s);
          const worldChangeCount = s.changes.length;

          const filteredEvents = s.events.filter(e => {
            if (!dmView && e.dmOnly) return false;
            if (eventTypeFilter.length > 0 && !eventTypeFilter.includes(e.type)) return false;
            return true;
          });

          return (
            <div
              key={s.id}
              id={`session-${s.id}`}
              style={{ position:"relative", marginBottom:16, paddingLeft:44 }}
            >
              {/* Timeline Dot with Arc Indicator */}
              <div style={{
                position:"absolute", left:latest?8:10, top:20,
                width:latest?16:12, height:latest?16:12, borderRadius:"50%",
                background:latest?T.crimson:T.bgMid, border:`3px solid ${latest?T.bgCard:T.textFaint}`,
                zIndex:1, boxShadow:latest?"0 0 12px rgba(192,57,43,0.4)":"none",
              }} />
              {arc && (
                <div style={{
                  position:"absolute", left:latest?6:8, top:latest?14:16, fontSize:8, color:T.bg, fontWeight:600,
                  background:T.crimson, width:latest?20:16, height:latest?20:16, borderRadius:"50%",
                  display:"flex", alignItems:"center", justifyContent:"center", zIndex:2
                }}>
                  A{arc.num}
                </div>
              )}

              {/* Session Card */}
              <div style={{
                background:isOpen?T.bgHover:T.bgCard,
                border:`1px solid ${isOpen?T.crimsonBorder:T.border}`,
                borderRadius:"4px", overflow:"hidden", boxShadow:"0 2px 8px rgba(0,0,0,0.08)",
                opacity:s.dmOnly?0.75:1,
                transition:"all 0.2s"
              }}>
                {/* Card Header - Always Visible */}
                <div
                  onClick={()=>toggle(s.id)}
                  style={{ padding:"16px 20px", display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}
                >
                  {isOpen ? <ChevronDown size={14} color={T.textFaint}/> : <ChevronRight size={14} color={T.textFaint}/>}
                  <span style={{ fontFamily:T.ui, fontSize:9, fontWeight:500, color:T.crimson, letterSpacing:"1.5px", background:T.crimsonSoft, padding:"2px 10px", borderRadius:"2px" }}>#{s.n}</span>
                  <div style={{ flex:1 }}>
                    <span style={{ fontSize:16, fontWeight:300, color:T.text }}>{s.title}</span>
                    <span style={{ fontSize:12, color:T.textFaint, marginLeft:12, fontStyle:"italic", fontWeight:300 }}>{s.date}</span>
                  </div>

                  {/* Inline Tags/Badges */}
                  <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", justifyContent:"flex-end" }}>
                    {worldChangeCount > 0 && <Tag variant="warning"><Globe size={8}/> {worldChangeCount} change{worldChangeCount>1?"s":""}</Tag>}
                    {s.dmOnly && <Tag variant="warning"><Lock size={8}/> DM</Tag>}
                    <Tag variant="muted">{filteredEvents.length} events</Tag>
                  </div>
                </div>

                {/* Event Type Breakdown Bar */}
                {breakdown.length > 0 && (
                  <div style={{
                    height:4,
                    display:"flex",
                    background:T.border,
                    borderBottom:`1px solid ${T.border}`
                  }}>
                    {breakdown.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          flex:item.pct,
                          background:evCols[item.type],
                          height:"100%"
                        }}
                        title={`${item.count} ${item.type}`}
                      />
                    ))}
                  </div>
                )}

                {/* Expandable Content */}
                {isOpen && (
                  <div onClick={e=>e.stopPropagation()} style={{ padding:"0 20px 20px", cursor:"default" }}>
                    {/* Summary */}
                    <p style={{ fontSize:13, fontFamily:T.body, color:T.textDim, lineHeight:1.8, margin:"16px 0 16px 26px", paddingLeft:0, fontWeight:300, fontStyle:"italic" }}>
                      {s.summary}
                    </p>

                    {/* World Changes Banner */}
                    {worldChangeCount > 0 && (
                      <div style={{
                        background:T.crimsonSoft,
                        border:`1px solid ${T.crimsonBorder}`,
                        borderRadius:"2px",
                        padding:12,
                        marginBottom:16,
                        marginLeft:26,
                        display:"flex",
                        gap:8,
                        alignItems:"start"
                      }}>
                        <Globe size={14} color={T.crimson} style={{marginTop:2, flexShrink:0}} />
                        <div>
                          <div style={{ fontSize:10, fontWeight:600, color:T.crimson, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:6 }}>World Impact</div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                            {s.changes.map((c, i) => <Tag key={i} variant="warning" style={{fontSize:10}}>{c}</Tag>)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Session Controls */}
                    <div style={{ display:"flex", gap:6, marginBottom:16, paddingLeft:26 }}>
                      <CrimsonBtn onClick={()=>toggleSessionDmOnly(s.id)} secondary small>
                        {s.dmOnly ? <><Unlock size={10}/> Make Visible</> : <><Lock size={10}/> DM Only</>}
                      </CrimsonBtn>
                      <CrimsonBtn onClick={()=>setAddingEvent(s.id)} secondary small><Plus size={10}/> Add Event</CrimsonBtn>
                      {compareMode && (
                        <CrimsonBtn
                          onClick={()=>{
                            const idx = selectedForCompare.indexOf(s.id);
                            if (idx >= 0) {
                              const newSel = [...selectedForCompare];
                              newSel[idx] = null;
                              setSelectedForCompare(newSel);
                            } else {
                              const emptyIdx = selectedForCompare.findIndex(x => x === null);
                              if (emptyIdx >= 0) {
                                const newSel = [...selectedForCompare];
                                newSel[emptyIdx] = s.id;
                                setSelectedForCompare(newSel);
                              }
                            }
                          }}
                          secondary
                          small
                          style={{ background:selectedForCompare.includes(s.id)?T.crimsonSoft:"transparent" }}
                        >
                          {selectedForCompare.includes(s.id) ? <CheckCircle size={10}/> : <Circle size={10}/>} Compare
                        </CrimsonBtn>
                      )}
                      <CrimsonBtn onClick={()=>deleteSession(s.id)} secondary small><Trash2 size={10}/> Delete</CrimsonBtn>
                    </div>

                    {/* Events List */}
                    {filteredEvents.length > 0 && (
                      <div style={{ marginBottom:16 }}>
                        <span style={{ fontFamily:T.ui, fontSize:9, letterSpacing:"2px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:10, paddingLeft:26, fontWeight:500 }}>Events</span>
                        {filteredEvents.map((ev, i) => {
                          const Icon = evIcons[ev.type] || Circle;
                          return (
                            <div
                              key={ev.id||i}
                              style={{
                                display:"flex", gap:12, padding:"10px 0 10px 26px", alignItems:"start",
                                borderBottom:i<filteredEvents.length-1?`1px solid ${T.borderMid}`:"none", opacity:ev.dmOnly?0.65:1
                              }}
                            >
                              <Icon size={13} color={evCols[ev.type]||T.textFaint} style={{marginTop:3,flexShrink:0}} />
                              <div style={{ flex:1 }}>
                                <div style={{ fontSize:13, color:T.textDim, fontWeight:300 }}>{ev.text}</div>
                                <div style={{ fontSize:12, color:T.textFaint, marginTop:3, fontWeight:300, display:"flex", alignItems:"center", gap:4 }}>
                                  <ArrowRight size={9}/> {ev.outcome}
                                </div>
                              </div>
                              <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                                {ev.dmOnly && <Tag variant="warning"><Lock size={7}/></Tag>}
                                <button onClick={()=>toggleEventDmOnly(s.id,ev.id)} style={{ background:"none", border:"none", cursor:"pointer", color:T.textFaint, padding:2 }}>
                                  {ev.dmOnly ? <Eye size={11}/> : <EyeOff size={11}/>}
                                </button>
                                <button onClick={()=>deleteEvent(s.id,ev.id)} style={{ background:"none", border:"none", cursor:"pointer", color:T.textFaint, padding:2 }}><Trash2 size={11}/></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add Event Inline */}
                    {addingEvent === s.id && (
                      <div style={{ paddingLeft:26, marginBottom:16, padding:16, background:T.bg, borderRadius:"2px", border:`1px solid ${T.border}` }}>
                        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                          <Select value={newEvent.type} onChange={v=>setNewEvent(p=>({...p,type:v}))} style={{ width:"100%", fontSize:10 }}>
                            {eventTypes.map(t=><option key={t} value={t}>{t.replace("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                          </Select>
                          <Input value={newEvent.text} onChange={v=>setNewEvent(p=>({...p,text:v}))} placeholder="What happened..." style={{fontSize:11}} />
                          <Input value={newEvent.outcome} onChange={v=>setNewEvent(p=>({...p,outcome:v}))} placeholder="Outcome..." style={{fontSize:11}} />
                          <ToggleSwitch on={newEvent.dmOnly} onToggle={()=>setNewEvent(p=>({...p,dmOnly:!p.dmOnly}))} label="DM Only" />
                          <div style={{ display:"flex", gap:6 }}>
                            <CrimsonBtn onClick={()=>addEvent(s.id)} small><Plus size={10}/> Add</CrimsonBtn>
                            <CrimsonBtn onClick={()=>setAddingEvent(null)} secondary small>Cancel</CrimsonBtn>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Session Notes */}
                    <div style={{ paddingLeft:26 }}>
                      <span style={{ fontFamily:T.ui, fontSize:9, letterSpacing:"2px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:8, fontWeight:500 }}>Session Notes</span>
                      <Textarea
                        value={typeof s.notes === "string" ? s.notes : ""}
                        onChange={v=>updateSessionNotes(s.id,v)}
                        placeholder="Session notes, DM thoughts, prep for next time..."
                        rows={3}
                        style={{fontSize:11}}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SESSION COMPARISON PANEL */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {compareMode && selectedForCompare[0] && selectedForCompare[1] && (
        <div style={{ position:"fixed", bottom:20, right:20, width:320, background:T.bgCard, border:`1px solid ${T.crimsonBorder}`, borderRadius:"4px", padding:16, boxShadow:"0 8px 24px rgba(0,0,0,0.2)", zIndex:100 }}>
          <div style={{ fontSize:11, fontWeight:600, color:T.crimson, textTransform:"uppercase", letterSpacing:"1px", marginBottom:12 }}>Session Comparison</div>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            {selectedForCompare.map((id, idx) => {
              const session = data.timeline.find(s => s.id === id);
              if (!session) return null;
              const encounters = session.events.filter(e => e.type === "encounter").length;
              const discoveries = session.events.filter(e => e.type === "discovery").length;
              const loot = session.events.filter(e => e.type === "loot").length;
              return (
                <div key={idx} style={{ flex:1, background:T.bg, padding:8, borderRadius:"2px", border:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:10, fontWeight:600, color:T.text, marginBottom:6 }}>Session #{session.n}</div>
                  <div style={{ fontSize:9, color:T.textMuted, marginBottom:6 }}>{session.title}</div>
                  <div style={{ fontSize:9, lineHeight:1.6, color:T.textDim }}>
                    <div>Encounters: <span style={{fontWeight:600}}>{encounters}</span></div>
                    <div>Discoveries: <span style={{fontWeight:600}}>{discoveries}</span></div>
                    <div>Loot: <span style={{fontWeight:600}}>{loot}</span></div>
                    <div>Total: <span style={{fontWeight:600}}>{session.events.length}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => setCompareMode(false)}
            style={{ width:"100%", padding:"6px 0", fontSize:10, fontWeight:500, background:T.bg, border:`1px solid ${T.border}`, borderRadius:"2px", cursor:"pointer", color:T.textMuted }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WORLD STATE
// ═══════════════════════════════════════════════════════════════════════════

function WorldView({ data, setData }) {
  const [sel,setSel] = useState(null);
  const [selType,setSelType] = useState(null);
  const [tab,setTab] = useState("map");
  const [editing,setEditing] = useState(false);
  const [addingEntity,setAddingEntity] = useState(false);

  // ── Map state — starts zoomed out to see the whole continent ──
  const [mapZoom, setMapZoom] = useState(0.25);
  const [mapPan, setMapPan] = useState({ x: 60, y: 30 });
  const [dragging, setDragging] = useState(null);
  const mapRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState("continent"); // continent | kingdom | local | detail

  // Update zoom level label
  useEffect(() => {
    if (mapZoom < 0.6) setZoomLevel("continent");
    else if (mapZoom < 1.5) setZoomLevel("kingdom");
    else if (mapZoom < 3.0) setZoomLevel("local");
    else setZoomLevel("detail");
  }, [mapZoom]);

  // ── Weather, territory, roads, and POI layer toggles ──
  const [showWeather, setShowWeather] = useState(true);
  const [showTerritories, setShowTerritories] = useState(true);
  const [showRoads, setShowRoads] = useState(true);
  const [showPOIs, setShowPOIs] = useState(true);
  const [mapSearch, setMapSearch] = useState("");
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [travelMode, setTravelMode] = useState(false);
  const [travelFrom, setTravelFrom] = useState(null);
  const [travelTo, setTravelTo] = useState(null);

  const conns = (type,ent) => {
    const c=[];
    if(type==="region"){ const f=data.factions.find(f=>f.name===ent.ctrl); if(f) c.push({type:"faction",e:f,label:"Controlled by"}); data.npcs.filter(n=>n.loc===ent.name).forEach(n=>c.push({type:"npc",e:n,label:"Located here"})); data.quests.filter(q=>q.region===ent.name).forEach(q=>c.push({type:"quest",e:q,label:"Active quest"})); }
    else if(type==="faction"){ data.regions.filter(r=>r.ctrl===ent.name).forEach(r=>c.push({type:"region",e:r,label:"Controls"})); data.npcs.filter(n=>n.faction===ent.name).forEach(n=>c.push({type:"npc",e:n,label:"Member"})); data.quests.filter(q=>q.faction===ent.name).forEach(q=>c.push({type:"quest",e:q,label:"Related quest"})); }
    else if(type==="npc"){ if(ent.faction){const f=data.factions.find(f=>f.name===ent.faction); if(f) c.push({type:"faction",e:f,label:"Member of"});} const r=data.regions.find(r=>r.name===ent.loc); if(r) c.push({type:"region",e:r,label:"Located in"}); }
    return c;
  };
  const tCols = { low:"#6fcf97", medium:"#d4a843", high:"#d97706", extreme:T.crimson };

  // ── Continental map — 6000×4500 world ──
  const MAP_W = 6000, MAP_H = 4500;

  // Deterministic hash seed
  const seed = useCallback((s) => { let h=0; for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;} return h; }, []);
  const seedF = useCallback((x,y,i) => { const v = Math.sin(x*12.9898+y*78.233+i*43758.5453)*43758.5453; return v - Math.floor(v); }, []);

  // ── Region map positions — spread across the continent ──
  const regionPositions = useCallback(() => {
    const pad=400;
    return data.regions.map((r,i) => {
      const s = seed(r.name+r.id);
      const angle = (i / Math.max(data.regions.length,1)) * Math.PI * 2 + (s%100)/200;
      const dist = 0.2 + (Math.abs(s%400)/700);
      // Kingdoms/capitals get more central placement, hamlets/dungeons get pushed outward
      const centralBias = (r.type==="kingdom"||r.type==="capital"||r.type==="city") ? 0.6 : 1.0;
      const x = Math.round(MAP_W/2 + Math.cos(angle) * (MAP_W/2 - pad) * dist * centralBias);
      const y = Math.round(MAP_H/2 + Math.sin(angle) * (MAP_H/2 - pad) * dist * centralBias);
      return { ...r, mx: Math.max(pad, Math.min(MAP_W-pad, x)), my: Math.max(pad, Math.min(MAP_H-pad, y)) };
    });
  }, [data.regions, seed]);

  const mapRegions = regionPositions();

  // ── Procedural POIs (dungeons, ruins, shrines, caves scattered across the world) ──
  const worldPOIs = useCallback(() => {
    const pois = [];
    const types = ["dungeon","ruins","dungeon","ruins","cave","shrine","cave","tower","grove","monolith"];
    const names = ["Darkhollow Crypt","Shattered Pillar","The Sunken Vault","Serpent's Den","Whispering Grotto",
      "Moonlit Shrine","Dragon's Maw Cave","Old Watchtower","The Twisted Grove","The Standing Stone",
      "Tomb of the Forgotten","Crumbling Bastion","The Bone Pit","Iron Gate Ruins","Crystalvein Cavern",
      "Stormbreak Spire","The Withered Oak","Ancestor's Cairn","Wraithwood Hollow","The Ember Forge",
      "Tidal Caves","Blightmoor Ruins","Gnarled Root Temple","Shadowpeak Mine","The Silent Obelisk",
      "Windscour Heights","Blackwater Grotto","Duskfall Sanctum","The Petrified Circle","Ironmaw Depths",
      "Thornkeep Ruins","Mistwalker's Shrine","The Frozen Barrow","Starfall Crater","Ashveil Catacombs"];
    for (let i=0; i<35; i++) {
      const a = seedF(i,7,3)*Math.PI*2;
      const d = 600 + seedF(i,11,5)*1800;
      const x = Math.round(MAP_W/2 + Math.cos(a)*d + seedF(i,3,1)*400-200);
      const y = Math.round(MAP_H/2 + Math.sin(a)*d*0.75 + seedF(i,5,2)*300-150);
      if(x>200 && x<MAP_W-200 && y>200 && y<MAP_H-200) {
        const threat = ["low","medium","high","extreme"][Math.floor(seedF(i,9,4)*4)];
        pois.push({ id:`poi-${i}`, name:names[i%names.length], type:types[i%types.length], x:Math.max(300,Math.min(MAP_W-300,x)), y:Math.max(300,Math.min(MAP_H-300,y)), threat });
      }
    }
    return pois;
  }, [seedF]);

  const pois = worldPOIs();

  // ── Weather zones — procedural weather system ──
  const weatherZones = useCallback(() => {
    const zones = [];
    const types = ["clear","cloudy","rain","storm","snow","fog","wind"];
    for(let i=0; i<12; i++){
      const x = 500 + seedF(i,30,1)*(MAP_W-1000);
      const y = 500 + seedF(i,30,2)*(MAP_H-1000);
      const r = 300 + seedF(i,30,3)*600;
      const type = types[Math.floor(seedF(i,30,4)*types.length)];
      zones.push({ x, y, r, type, key:`wz-${i}` });
    }
    return zones;
  }, [seedF]);

  // ── Travel distance calculator ──
  const calcTravel = useCallback((from, to) => {
    if(!from || !to) return null;
    const dist = Math.hypot(from.mx-to.mx, from.my-to.my);
    const leagues = Math.round(dist / 20);  // 20px = 1 league
    const daysWalk = Math.round(leagues / 8); // 8 leagues/day on foot
    const daysHorse = Math.round(leagues / 24); // 24 leagues/day mounted
    const dangerLevel = ["low","medium","high","extreme"].indexOf(from.threat||"low") + ["low","medium","high","extreme"].indexOf(to.threat||"low");
    return { leagues, daysWalk: Math.max(1,daysWalk), daysHorse: Math.max(1,daysHorse), danger: dangerLevel > 4 ? "extreme" : dangerLevel > 2 ? "high" : dangerLevel > 0 ? "medium" : "low" };
  }, []);
  const travelInfo = travelMode && travelFrom && travelTo ? calcTravel(travelFrom, travelTo) : null;

  // ── Encounter zone generation ──
  const encounterZones = useCallback(() => {
    const zones = [];
    const types = ["bandits","wildlife","undead","elementals","fey","dragon","goblinoids","aberrations"];
    const names = ["Bandit's Pass","Wolf Den","Haunted Crossing","Elemental Rift","Fey Circle","Dragon's Shadow","Goblin Warrens","The Warp"];
    for(let i=0; i<20; i++){
      const a = seedF(i,40,1)*Math.PI*2;
      const d = 800 + seedF(i,40,2)*1600;
      const x = MAP_W/2 + Math.cos(a)*d;
      const y = MAP_H/2 + Math.sin(a)*d*0.75;
      if(x>300 && x<MAP_W-300 && y>300 && y<MAP_H-300) {
        const cr = Math.floor(1 + seedF(i,40,5)*15);
        zones.push({ id:`enc-${i}`, x, y, r:80+seedF(i,40,3)*120, type:types[i%types.length], name:names[i%names.length], cr, key:`enc-${i}` });
      }
    }
    return zones;
  }, [seedF]);

  // ── Roads: connect regions by faction, proximity, and type — with major/minor classifications ──
  const roads = useCallback(() => {
    const rs = [];
    const mr = mapRegions;
    for (let i=0; i<mr.length; i++) {
      for (let j=i+1; j<mr.length; j++) {
        const a = mr[i], b = mr[j];
        const shareCtrl = a.ctrl && b.ctrl && a.ctrl === b.ctrl;
        const questLink = data.quests.some(q => (q.region===a.name && data.factions.some(f=>f.name===q.faction && data.regions.some(r2=>r2.ctrl===f.name && r2.name===b.name))) || (q.region===b.name && data.factions.some(f=>f.name===q.faction && data.regions.some(r2=>r2.ctrl===f.name && r2.name===a.name))));
        const isRoute = a.type==="route" || b.type==="route";
        const dist = Math.hypot(a.mx-b.mx, a.my-b.my);
        const isMajor = (a.type==="city"||a.type==="kingdom"||a.type==="capital") && (b.type==="city"||b.type==="kingdom"||b.type==="capital");
        if (shareCtrl || questLink || isRoute || dist < 1200) {
          // Multi-segment organic curved path for longer roads
          const segs = dist > 800 ? 3 : dist > 400 ? 2 : 1;
          let path = `M${a.mx},${a.my}`;
          for (let s=0; s<segs; s++) {
            const t1 = (s+0.5)/segs, t2 = (s+1)/segs;
            const cx = a.mx + (b.mx-a.mx)*t1 + Math.sin(a.mx*0.007+b.my*0.011+s*2)*80*(dist/800);
            const cy = a.my + (b.my-a.my)*t1 + Math.cos(a.my*0.009+b.mx*0.013+s*3)*60*(dist/800);
            const ex = a.mx + (b.mx-a.mx)*t2;
            const ey = a.my + (b.my-a.my)*t2;
            path += ` Q${Math.round(cx)},${Math.round(cy)} ${Math.round(ex)},${Math.round(ey)}`;
          }
          rs.push({ from:a, to:b, path, dist, major:isMajor||shareCtrl });
        }
      }
    }
    return rs;
  }, [mapRegions, data.quests, data.factions, data.regions]);

  // ── Zoom / Pan handlers — wider range for continental zoom (0.15x to 8x) ──
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    // Proportional zoom speed — faster at high zoom, slower at low zoom
    const factor = e.deltaY > 0 ? 0.88 : 1.14;
    const newZoom = Math.max(0.12, Math.min(8, mapZoom * factor));
    const ratio = newZoom / mapZoom;
    setMapPan(p => ({ x: mx - (mx - p.x) * ratio, y: my - (my - p.y) * ratio }));
    setMapZoom(newZoom);
  }, [mapZoom]);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setDragging({ startX: e.clientX, startY: e.clientY, panX: mapPan.x, panY: mapPan.y });
  }, [mapPan]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    setMapPan({ x: dragging.panX + (e.clientX - dragging.startX), y: dragging.panY + (e.clientY - dragging.startY) });
  }, [dragging]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  const selectRegion = (r) => { setSel(r); setSelType("region"); setEditing(false); };

  // ── Continental terrain generation — mountain ranges, forests, hills ──
  const terrainFeatures = useCallback(() => {
    const features = [];
    // Large mountain ranges spanning the continent
    const mtRanges = [
      { cx:800, cy:600, spread:500, count:22, dir:0.3 },
      { cx:4200, cy:900, spread:450, count:20, dir:-0.4 },
      { cx:2800, cy:400, spread:600, count:28, dir:0.1 },
      { cx:1200, cy:3200, spread:400, count:16, dir:0.6 },
      { cx:4800, cy:2800, spread:350, count:14, dir:-0.2 },
      { cx:3000, cy:2200, spread:300, count:12, dir:0.5 },
      { cx:5200, cy:1600, spread:280, count:10, dir:-0.1 },
      { cx:600, cy:2000, spread:250, count:9, dir:0.8 },
    ];
    mtRanges.forEach((range,ri) => {
      for(let i=0;i<range.count;i++){
        // Elongated ranges — mountains follow a directional line
        const t = (i/range.count - 0.5) * 2;
        const baseX = range.cx + Math.cos(range.dir)*t*range.spread;
        const baseY = range.cy + Math.sin(range.dir)*t*range.spread*0.6;
        const x = baseX + seedF(ri,i,1)*100-50;
        const y = baseY + seedF(ri,i,2)*70-35;
        const s = 0.7 + seedF(ri,i,3)*1.0;
        features.push({ type:"mountain", x, y, scale:s, key:`mt-${ri}-${i}` });
      }
    });
    // Dense forest clusters
    const forests = [
      { cx:1800, cy:1600, spread:400, count:28 },
      { cx:600, cy:1500, spread:300, count:20 },
      { cx:3800, cy:2400, spread:350, count:24 },
      { cx:3200, cy:1000, spread:250, count:16 },
      { cx:1000, cy:800, spread:280, count:18 },
      { cx:5000, cy:800, spread:220, count:14 },
      { cx:2200, cy:3400, spread:300, count:20 },
      { cx:4400, cy:3600, spread:260, count:16 },
      { cx:1400, cy:2600, spread:200, count:12 },
      { cx:3600, cy:600, spread:180, count:10 },
      { cx:5400, cy:2200, spread:200, count:12 },
      { cx:800, cy:3800, spread:240, count:15 },
    ];
    forests.forEach((f,fi) => {
      for(let i=0;i<f.count;i++){
        const a = (i/f.count)*Math.PI*2 + seedF(fi,i,5)*0.6;
        const d = f.spread * (0.15 + seedF(fi,i,4)*0.85);
        const x = f.cx + Math.cos(a)*d + seedF(fi,i,6)*60-30;
        const y = f.cy + Math.sin(a)*d + seedF(fi,i,7)*50-25;
        const s = 0.5 + seedF(fi,i,8)*0.7;
        features.push({ type:"tree", x, y, scale:s, key:`tr-${fi}-${i}` });
      }
    });
    // Scattered small hills (visible at medium zoom)
    for(let i=0;i<60;i++){
      const x = 400 + seedF(i,20,1)*(MAP_W-800);
      const y = 400 + seedF(i,20,2)*(MAP_H-800);
      features.push({ type:"hill", x, y, scale:0.4+seedF(i,20,3)*0.4, key:`hill-${i}` });
    }
    return features;
  }, [seedF]);

  const terrain = terrainFeatures();

  // ── Kingdom territory polygons (convex hulls of faction-controlled regions) ──
  const territories = useCallback(() => {
    const factionRegions = {};
    mapRegions.forEach(r => {
      if(r.ctrl) {
        if(!factionRegions[r.ctrl]) factionRegions[r.ctrl] = [];
        factionRegions[r.ctrl].push(r);
      }
    });
    const results = [];
    Object.entries(factionRegions).forEach(([fName, regs]) => {
      if(regs.length < 2) return;
      const faction = data.factions.find(f=>f.name===fName);
      if(!faction) return;
      // Simple convex hull approximation: sort by angle from centroid
      const cx = regs.reduce((s,r)=>s+r.mx,0)/regs.length;
      const cy = regs.reduce((s,r)=>s+r.my,0)/regs.length;
      const sorted = [...regs].sort((a,b) => Math.atan2(a.my-cy,a.mx-cx) - Math.atan2(b.my-cy,b.mx-cx));
      // Expand outward for territory border
      const points = sorted.map(r => {
        const dx = r.mx-cx, dy = r.my-cy;
        const d = Math.hypot(dx,dy) || 1;
        return { x: r.mx + (dx/d)*180, y: r.my + (dy/d)*140 };
      });
      const path = points.map((p,i) => {
        if(i===0) return `M${Math.round(p.x)},${Math.round(p.y)}`;
        const prev = points[(i-1+points.length)%points.length];
        const cpx = (prev.x+p.x)/2 + (Math.sin(i*1.5)*40);
        const cpy = (prev.y+p.y)/2 + (Math.cos(i*1.7)*30);
        return `Q${Math.round(cpx)},${Math.round(cpy)} ${Math.round(p.x)},${Math.round(p.y)}`;
      }).join(" ") + "Z";
      results.push({ faction:fName, color:faction.color, path });
    });
    return results;
  }, [mapRegions, data.factions]);

  const updateFaction = (id, updates) => {
    setData(d=>({...d, factions:d.factions.map(f=>f.id===id?{...f,...updates}:f)}));
    if(sel?.id===id && selType==="faction") setSel(p=>({...p,...updates}));
  };
  const updateRegion = (id, updates) => {
    setData(d=>({...d, regions:d.regions.map(r=>r.id===id?{...r,...updates}:r)}));
    if(sel?.id===id && selType==="region") setSel(p=>({...p,...updates}));
  };
  const updateNpc = (id, updates) => {
    setData(d=>({...d, npcs:d.npcs.map(n=>n.id===id?{...n,...updates}:n)}));
    if(sel?.id===id && selType==="npc") setSel(p=>({...p,...updates}));
  };
  const addEntity = (type, entity) => {
    const newE = { ...entity, id:uid() };
    if(type==="region") setData(d=>({...d,regions:[...d.regions,newE]}));
    if(type==="faction") setData(d=>({...d,factions:[...d.factions,newE]}));
    if(type==="npc") setData(d=>({...d,npcs:[...d.npcs,newE]}));
    setAddingEntity(false);
  };

  // ── Inline SVG terrain renderers for the map ──
  const MtnSvg = ({ x, y, s }) => (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M0,0 L-18,-35 Q-15,-42,-8,-40 L0,-50 L8,-40 Q15,-42,18,-35 L0,0Z" fill="var(--text-faint)" opacity="0.12" stroke="var(--text-faint)" strokeWidth="1.2"/>
      <path d="M0,-50 L-5,-38 L-2,-40 L0,-45 L2,-40 L5,-38 L0,-50Z" fill="var(--text-muted)" opacity="0.18"/>
      <path d="M-6,-30 Q-3,-36,0,-50" stroke="var(--text-faint)" strokeWidth="0.5" opacity="0.2" fill="none"/>
    </g>
  );
  const TreeSvg = ({ x, y, s }) => (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <line x1="0" y1="0" x2="0" y2="-12" stroke="var(--text-faint)" strokeWidth="1.5" opacity="0.5"/>
      <path d="M0,-30 C-8,-30,-14,-24,-13,-18 C-16,-17,-15,-12,-12,-11 C-13,-8,-9,-5,-5,-6 C-4,-3,4,-3,5,-6 C9,-5,13,-8,12,-11 C15,-12,16,-17,13,-18 C14,-24,8,-30,0,-30Z" fill="var(--text-faint)" opacity="0.1" stroke="var(--text-faint)" strokeWidth="0.9"/>
    </g>
  );
  const HillSvg = ({ x, y, s }) => (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <path d="M-20,0 Q-10,-18 0,-22 Q10,-18 20,0Z" fill="var(--text-faint)" opacity="0.06" stroke="var(--text-faint)" strokeWidth="0.6" opacity="0.12"/>
    </g>
  );
  // POI icon renderer for scattered world POIs
  const POISvg = ({ poi, zoom: z }) => {
    const iconSize = z > 3 ? 28 : 22;
    const FI = FANTASY_ICONS[poi.type] || MapIconRuins;
    const threatCol = tCols[poi.threat] || "var(--text-muted)";
    return (
      <g style={{ cursor:"pointer" }} onClick={(e)=>{e.stopPropagation();setSel({...poi,id:poi.id});setSelType("poi");}}>
        <g transform={`translate(${poi.x - iconSize/2},${poi.y - iconSize/2})`}>
          <FI size={iconSize} color={threatCol} />
        </g>
        {z > 2.5 && <text x={poi.x} y={poi.y+18} textAnchor="middle" fill="var(--text-muted)" fontFamily="'Spectral', serif" fontSize="8" fontStyle="italic" opacity="0.7" style={{pointerEvents:"none"}}>{poi.name}</text>}
      </g>
    );
  };

  const roadList = roads();

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 56px)", overflow:"hidden" }}>
      {/* Top bar */}
      <div style={{ display:"flex", alignItems:"center", gap:0, padding:"0 24px", borderBottom:`1px solid ${T.border}`, flexShrink:0, background:T.bgNav }}>
        {["map","regions","factions","npcs"].map(t => (
          <button key={t} onClick={()=>{setTab(t);if(t!=="map"){setSel(null);setEditing(false);}}} style={{
            padding:"14px 24px", background:"transparent", border:"none", cursor:"pointer",
            fontFamily:T.ui, fontSize:9, letterSpacing:"2px", textTransform:"uppercase", fontWeight:500,
            color:tab===t?T.crimson:T.textMuted, transition:"all 0.3s",
            borderBottom:tab===t?`2px solid ${T.crimson}`:"2px solid transparent",
          }}>{t==="map"?"Fantasy Map":t}</button>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
          {tab==="map" && <>
            <span style={{ fontFamily:T.ui, fontSize:8, color:T.crimson, letterSpacing:"1px", fontWeight:500 }}>{zoomLevel.toUpperCase()}</span>
            <span style={{ fontFamily:T.ui, fontSize:8, color:T.textMuted, letterSpacing:"1px" }}>{Math.round(mapZoom*100)}%</span>
            <button onClick={()=>setMapZoom(z=>Math.min(8,z*1.3))} style={{ padding:"4px 8px", background:"transparent", border:`1px solid ${T.border}`, color:T.textMuted, fontSize:13, cursor:"pointer", borderRadius:"2px" }}>+</button>
            <button onClick={()=>setMapZoom(z=>Math.max(0.12,z*0.77))} style={{ padding:"4px 8px", background:"transparent", border:`1px solid ${T.border}`, color:T.textMuted, fontSize:13, cursor:"pointer", borderRadius:"2px" }}>−</button>
            <button onClick={()=>{setMapZoom(0.25);setMapPan({x:60,y:30});}} style={{ padding:"4px 10px", background:"transparent", border:`1px solid ${T.border}`, color:T.textMuted, fontFamily:T.ui, fontSize:8, letterSpacing:"1px", textTransform:"uppercase", cursor:"pointer", borderRadius:"2px" }}>Continent</button>
            <button onClick={()=>{setMapZoom(1);setMapPan({x:-1200,y:-800});}} style={{ padding:"4px 10px", background:"transparent", border:`1px solid ${T.border}`, color:T.textMuted, fontFamily:T.ui, fontSize:8, letterSpacing:"1px", textTransform:"uppercase", cursor:"pointer", borderRadius:"2px" }}>Kingdom</button>
            <button onClick={()=>{setMapZoom(2.5);setMapPan({x:-4500,y:-3200});}} style={{ padding:"4px 10px", background:"transparent", border:`1px solid ${T.border}`, color:T.textMuted, fontFamily:T.ui, fontSize:8, letterSpacing:"1px", textTransform:"uppercase", cursor:"pointer", borderRadius:"2px" }}>Local</button>
            <div style={{ width:1, height:18, background:T.border, margin:"0 4px" }}/>
            <button onClick={()=>setShowWeather(w=>!w)} style={{ padding:"4px 10px", background:showWeather?"rgba(100,149,237,0.15)":"transparent", border:`1px solid ${showWeather?'rgba(100,149,237,0.4)':T.border}`, color:showWeather?"#6495ed":T.textMuted, fontFamily:T.ui, fontSize:8, letterSpacing:"1px", textTransform:"uppercase", cursor:"pointer", borderRadius:"2px" }}>Weather</button>
            <button onClick={()=>setShowTerritories(t=>!t)} style={{ padding:"4px 10px", background:showTerritories?"rgba(148,163,184,0.15)":"transparent", border:`1px solid ${showTerritories?'rgba(148,163,184,0.4)':T.border}`, color:showTerritories?T.textDim:T.textMuted, fontFamily:T.ui, fontSize:8, letterSpacing:"1px", textTransform:"uppercase", cursor:"pointer", borderRadius:"2px" }}>Borders</button>
            <button onClick={()=>setShowRoads(r=>!r)} style={{ padding:"4px 10px", background:showRoads?"rgba(148,163,184,0.15)":"transparent", border:`1px solid ${showRoads?'rgba(148,163,184,0.4)':T.border}`, color:showRoads?T.textDim:T.textMuted, fontFamily:T.ui, fontSize:8, letterSpacing:"1px", textTransform:"uppercase", cursor:"pointer", borderRadius:"2px" }}>Roads</button>
            <button onClick={()=>setTravelMode(m=>!m)} style={{ padding:"4px 10px", background:travelMode?"rgba(220,20,60,0.15)":"transparent", border:`1px solid ${travelMode?T.crimsonBorder:T.border}`, color:travelMode?T.crimson:T.textMuted, fontFamily:T.ui, fontSize:8, letterSpacing:"1px", textTransform:"uppercase", cursor:"pointer", borderRadius:"2px" }}>Travel</button>
            {tab==="map" && <div style={{ position:"relative" }}>
              <input value={mapSearch} onChange={e=>setMapSearch(e.target.value)} placeholder="Search map..." style={{ padding:"5px 10px 5px 28px", border:`1px solid ${T.border}`, borderRadius:"2px", background:T.bgInput, fontSize:11, fontFamily:T.body, color:T.text, outline:"none", width:140 }}/>
              <Search size={11} color={T.textFaint} style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)" }}/>
            </div>}
          </>}
          <CrimsonBtn onClick={()=>setAddingEntity(true)} small><Plus size={11}/> Add</CrimsonBtn>
        </div>
      </div>

      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
        {/* ══════════ FANTASY MAP TAB — Multi-scale continental map ══════════ */}
        {tab==="map" && (
          <div ref={mapRef} style={{ flex:1, overflow:"hidden", cursor:dragging?"grabbing":"grab", position:"relative", background:T.bg }}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
            onWheel={handleWheel}>
            <svg width="100%" height="100%" style={{ display:"block" }}>
              <defs>
                {/* Parchment texture filter */}
                <filter id="parchment">
                  <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="5" result="noise"/>
                  <feDiffuseLighting in="noise" lightingColor="var(--bg-card)" surfaceScale="1.2" result="lit"><feDistantLight azimuth="45" elevation="55"/></feDiffuseLighting>
                  <feComposite in="SourceGraphic" in2="lit" operator="arithmetic" k1="0.7" k2="0.35" k3="0" k4="0"/>
                </filter>
                {/* Water pattern */}
                <pattern id="waterPat" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                  <path d="M0,40 Q20,35 40,40 Q60,45 80,40" stroke="var(--crimson-border)" strokeWidth="0.5" fill="none" opacity="0.25"/>
                  <path d="M0,55 Q20,50 40,55 Q60,60 80,55" stroke="var(--crimson-border)" strokeWidth="0.3" fill="none" opacity="0.15"/>
                  <path d="M0,25 Q20,20 40,25 Q60,30 80,25" stroke="var(--crimson-border)" strokeWidth="0.3" fill="none" opacity="0.12"/>
                </pattern>
                {/* Glow for cities */}
                <filter id="cityGlow">
                  <feGaussianBlur stdDeviation="4" result="blur"/>
                  <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                </filter>
              </defs>

              <g transform={`translate(${mapPan.x},${mapPan.y}) scale(${mapZoom})`}>
                {/* ═══ LAYER 0: Base map — always visible ═══ */}
                <rect x="0" y="0" width={MAP_W} height={MAP_H} rx="12" fill="var(--bg-card)" stroke="var(--crimson-border)" strokeWidth="3" filter="url(#parchment)"/>

                {/* ═══ LAYER 1: Continental geography — ocean, coastlines, major water ═══ */}
                {/* Western ocean */}
                <path d="M0,0 L0,4500 Q300,4200 250,3600 Q180,3000 320,2400 Q250,1800 200,1200 Q300,600 180,0 Z" fill="var(--crimson-soft)" opacity="0.25"/>
                <path d="M0,0 L0,4500 Q300,4200 250,3600 Q180,3000 320,2400 Q250,1800 200,1200 Q300,600 180,0 Z" fill="url(#waterPat)"/>
                {/* Eastern ocean */}
                <path d="M6000,0 L6000,4500 Q5700,4100 5750,3400 Q5800,2700 5680,2000 Q5750,1300 5800,600 Q5700,200 5750,0 Z" fill="var(--crimson-soft)" opacity="0.2"/>
                <path d="M6000,0 L6000,4500 Q5700,4100 5750,3400 Q5800,2700 5680,2000 Q5750,1300 5800,600 Q5700,200 5750,0 Z" fill="url(#waterPat)"/>
                {/* Northern sea */}
                <path d="M0,0 L6000,0 L6000,200 Q5000,350 4000,250 Q3000,400 2000,300 Q1000,380 0,250 Z" fill="var(--crimson-soft)" opacity="0.2"/>
                <path d="M0,0 L6000,0 L6000,200 Q5000,350 4000,250 Q3000,400 2000,300 Q1000,380 0,250 Z" fill="url(#waterPat)"/>
                {/* Southern sea */}
                <path d="M0,4500 L6000,4500 L6000,4250 Q5000,4100 4000,4200 Q3000,4080 2000,4180 Q1000,4100 0,4220 Z" fill="var(--crimson-soft)" opacity="0.2"/>
                <path d="M0,4500 L6000,4500 L6000,4250 Q5000,4100 4000,4200 Q3000,4080 2000,4180 Q1000,4100 0,4220 Z" fill="url(#waterPat)"/>
                {/* Inland sea */}
                <ellipse cx="3000" cy="2000" rx="400" ry="250" fill="var(--crimson-soft)" opacity="0.18"/>
                <ellipse cx="3000" cy="2000" rx="400" ry="250" fill="url(#waterPat)"/>
                {/* Large lake */}
                <ellipse cx="1600" cy="3200" rx="200" ry="140" fill="var(--crimson-soft)" opacity="0.15"/>
                <ellipse cx="1600" cy="3200" rx="200" ry="140" fill="url(#waterPat)"/>
                {/* Bay */}
                <path d="M4800,4500 Q4600,4000 4900,3800 Q5200,3700 5400,4000 Q5600,4300 5500,4500 Z" fill="var(--crimson-soft)" opacity="0.15"/>
                <path d="M4800,4500 Q4600,4000 4900,3800 Q5200,3700 5400,4000 Q5600,4300 5500,4500 Z" fill="url(#waterPat)"/>

                {/* Major rivers */}
                <path d="M1800,300 Q1850,600 1700,1000 Q1600,1400 1650,1800 Q1700,2200 1600,2600 Q1550,3000 1600,3200" stroke="var(--crimson-border)" strokeWidth="3" fill="none" opacity="0.3" strokeLinecap="round"/>
                <path d="M3200,400 Q3100,800 3150,1200 Q3050,1600 3000,2000" stroke="var(--crimson-border)" strokeWidth="2.5" fill="none" opacity="0.25" strokeLinecap="round"/>
                <path d="M4500,600 Q4400,1000 4500,1400 Q4550,1800 4400,2200 Q4350,2600 4500,3000 Q4600,3400 4500,3800" stroke="var(--crimson-border)" strokeWidth="2.5" fill="none" opacity="0.25" strokeLinecap="round"/>
                {/* Tributary rivers — visible at kingdom zoom */}
                {mapZoom > 0.5 && <>
                  <path d="M1200,1200 Q1400,1300 1650,1400" stroke="var(--crimson-border)" strokeWidth="1.5" fill="none" opacity="0.2" strokeLinecap="round"/>
                  <path d="M2200,1800 Q2500,1900 3000,2000" stroke="var(--crimson-border)" strokeWidth="1.5" fill="none" opacity="0.18" strokeLinecap="round"/>
                  <path d="M3800,1200 Q3600,1400 3150,1600" stroke="var(--crimson-border)" strokeWidth="1.2" fill="none" opacity="0.15" strokeLinecap="round"/>
                  <path d="M5200,2000 Q4900,2100 4500,2200" stroke="var(--crimson-border)" strokeWidth="1.2" fill="none" opacity="0.15" strokeLinecap="round"/>
                </>}

                {/* ═══ LAYER 2: Kingdom territories — visible at continent/kingdom zoom ═══ */}
                {showTerritories && mapZoom < 2.5 && territories().map((t,i) => (
                  <path key={`terr-${i}`} d={t.path} fill={t.color} opacity={0.06 + (mapZoom > 0.5 ? 0.04 : 0)} stroke={t.color} strokeWidth={mapZoom > 0.6 ? 1.5 : 2.5} strokeDasharray="12,8" strokeOpacity="0.3"/>
                ))}

                {/* ═══ LAYER 3: Terrain features — scale-dependent ═══ */}
                {/* Mountains — always visible (they define the landscape) */}
                {terrain.filter(t=>t.type==="mountain").map(t => <MtnSvg key={t.key} x={t.x} y={t.y} s={t.scale}/>)}
                {/* Hills — visible at kingdom zoom and closer */}
                {mapZoom > 0.5 && terrain.filter(t=>t.type==="hill").map(t => <HillSvg key={t.key} x={t.x} y={t.y} s={t.scale}/>)}
                {/* Forests — visible from kingdom zoom */}
                {mapZoom > 0.4 && terrain.filter(t=>t.type==="tree").map(t => <TreeSvg key={t.key} x={t.x} y={t.y} s={t.scale}/>)}

                {/* ═══ LAYER 4: Roads — major roads at kingdom zoom, minor at local ═══ */}
                {showRoads && <g opacity={mapZoom > 0.5 ? Math.min(1, (mapZoom-0.5)*1.5) : 0} style={{ transition:"opacity 0.3s" }}>
                  {roadList.filter(rd=>rd.major).map((rd,i) => (
                    <path key={`mroad-${i}`} d={rd.path} stroke="var(--text-faint)" strokeWidth={mapZoom > 1.5 ? 1.5 : 3} fill="none" strokeDasharray={mapZoom > 2 ? "10,8" : "16,12"} opacity="0.5" strokeLinecap="round"/>
                  ))}
                </g>}
                {showRoads && mapZoom > 0.8 && <g opacity={Math.min(1, (mapZoom-0.8)*2)} style={{ transition:"opacity 0.3s" }}>
                  {roadList.filter(rd=>!rd.major).map((rd,i) => (
                    <path key={`road-${i}`} d={rd.path} stroke="var(--text-faint)" strokeWidth={mapZoom > 2 ? 0.8 : 1.5} fill="none" strokeDasharray="6,6" opacity="0.35" strokeLinecap="round"/>
                  ))}
                </g>}

                {/* ═══ LAYER 5: Region markers — scale-dependent icon/label sizing ═══ */}
                {mapRegions.filter(r => !mapSearch || r.name.toLowerCase().includes(mapSearch.toLowerCase())).map(r => {
                  const active = sel?.id===r.id && selType==="region";
                  const threatCol = tCols[r.threat] || "var(--text-muted)";
                  const isBig = r.type==="city"||r.type==="kingdom"||r.type==="capital";
                  const isSmall = r.type==="hamlet"||r.type==="ruins"||r.type==="dungeon";
                  // Hide small settlements at continent zoom
                  if(isSmall && mapZoom < 0.5) return null;
                  // Scale icons inversely with zoom for readability at all levels
                  const baseSize = isBig ? 60 : isSmall ? 30 : 42;
                  const iconSize = Math.max(18, Math.min(baseSize, baseSize / Math.max(mapZoom*0.8, 0.5)));
                  const fontSize = isBig ? Math.max(8, 16/Math.max(mapZoom*0.7,0.4)) : Math.max(6, 12/Math.max(mapZoom*0.7,0.4));
                  return (
                    <g key={r.id} onClick={(e)=>{e.stopPropagation(); if(travelMode){if(!travelFrom) setTravelFrom(r); else if(!travelTo) setTravelTo(r); else {setTravelFrom(r);setTravelTo(null);}} else selectRegion(r);}} style={{ cursor:"pointer" }}>
                      {/* Glow ring on selection */}
                      {active && <circle cx={r.mx} cy={r.my} r={isBig?50:35} fill="none" stroke="var(--crimson)" strokeWidth="2.5" opacity="0.5" strokeDasharray="8,5">
                        <animate attributeName="stroke-dashoffset" from="0" to="26" dur="2s" repeatCount="indefinite"/>
                      </circle>}
                      {/* City glow at continental zoom */}
                      {isBig && mapZoom < 0.6 && <circle cx={r.mx} cy={r.my} r="30" fill={threatCol} opacity="0.08"/>}
                      {/* Icon */}
                      <g transform={`translate(${r.mx - iconSize/2},${r.my - iconSize/2})`}>
                        {(() => { const FI = getFantasyIcon(r.type); return <FI size={iconSize} color={threatCol} />; })()}
                      </g>
                      {/* Label — always show for kingdoms/cities, show others when zoomed */}
                      {(isBig || mapZoom > 0.4) && (
                        <text x={r.mx} y={r.my + (isBig?40:28)} textAnchor="middle" fill="var(--text)" fontFamily="'Cinzel', serif" fontSize={fontSize} fontWeight={isBig?"600":"500"} letterSpacing={isBig?"2.5":"1.5"} opacity={active?1:0.85} style={{ textTransform:"uppercase", pointerEvents:"none" }}>
                          {r.name}
                        </text>
                      )}
                      {/* Faction/state subtitle — kingdom zoom+ */}
                      {mapZoom > 0.8 && (
                        <text x={r.mx} y={r.my + (isBig?54:40)} textAnchor="middle" fill="var(--text-muted)" fontFamily="'Spectral', serif" fontSize={Math.max(6,10/Math.max(mapZoom*0.7,0.5))} fontStyle="italic" fontWeight="300" opacity="0.65" style={{ pointerEvents:"none" }}>
                          {r.ctrl ? r.ctrl : r.type} — {r.state}
                        </text>
                      )}
                      {/* Threat pip — local zoom+ */}
                      {mapZoom > 1.0 && (
                        <circle cx={r.mx + (isBig?28:20)} cy={r.my - (isBig?24:16)} r="5" fill={threatCol} opacity="0.7"/>
                      )}
                      {/* Visited marker — local zoom+ */}
                      {r.visited && mapZoom > 1.2 && (
                        <g transform={`translate(${r.mx-(isBig?28:20)},${r.my-(isBig?26:18)})`}>
                          <circle r="6" fill="var(--bg-card)" stroke="var(--text-muted)" strokeWidth="0.7"/>
                          <path d="M-2.5,0 L-0.5,2.5 L3,-2.5" stroke="#6fcf97" strokeWidth="1.4" fill="none" strokeLinecap="round"/>
                        </g>
                      )}
                      {/* Building cluster hint at detail zoom for towns/cities */}
                      {mapZoom > 3 && (isBig || r.type==="town") && (
                        <g opacity="0.2">
                          {[0,1,2,3,4].map(bi => {
                            const bx = r.mx + Math.cos(bi*1.3)*35 + seedF(bi,r.mx,1)*20-10;
                            const by = r.my + Math.sin(bi*1.3)*30 + seedF(bi,r.my,2)*15-8;
                            return <rect key={`b-${bi}`} x={bx-4} y={by-4} width={8+seedF(bi,3,3)*6} height={7+seedF(bi,4,4)*5} fill="var(--text-faint)" rx="1"/>;
                          })}
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* ═══ LAYER 6: World POIs — visible at local zoom+ ═══ */}
                {showPOIs && mapZoom > 1.5 && pois.map(p => <POISvg key={p.id} poi={p} zoom={mapZoom}/>)}

                {/* ═══ LAYER 7: Weather overlay ═══ */}
                {showWeather && mapZoom > 0.4 && weatherZones().map(wz => (
                  <g key={wz.key} opacity={0.12 + (mapZoom > 1 ? 0.08 : 0)}>
                    {wz.type==="rain" && <><circle cx={wz.x} cy={wz.y} r={wz.r} fill="rgba(100,149,237,0.08)" stroke="rgba(100,149,237,0.15)" strokeWidth="1" strokeDasharray="8,6"/>
                      {mapZoom > 1 && [0,1,2,3,4,5].map(ri => <line key={`r-${ri}`} x1={wz.x-wz.r*0.6+ri*(wz.r*0.24)} y1={wz.y-20} x2={wz.x-wz.r*0.6+ri*(wz.r*0.24)-8} y2={wz.y+20} stroke="rgba(100,149,237,0.2)" strokeWidth="1" strokeLinecap="round"/>)}</>}
                    {wz.type==="storm" && <><circle cx={wz.x} cy={wz.y} r={wz.r} fill="rgba(75,0,130,0.06)" stroke="rgba(75,0,130,0.15)" strokeWidth="1.5" strokeDasharray="4,4"/>
                      {mapZoom > 1 && <path d={`M${wz.x-10},${wz.y-15} L${wz.x+5},${wz.y-2} L${wz.x-5},${wz.y-2} L${wz.x+10},${wz.y+15}`} stroke="rgba(255,215,0,0.3)" strokeWidth="1.5" fill="none"/>}</>}
                    {wz.type==="snow" && <circle cx={wz.x} cy={wz.y} r={wz.r} fill="rgba(200,220,255,0.06)" stroke="rgba(200,220,255,0.15)" strokeWidth="1" strokeDasharray="3,6"/>}
                    {wz.type==="fog" && <ellipse cx={wz.x} cy={wz.y} rx={wz.r*1.3} ry={wz.r*0.6} fill="rgba(180,180,180,0.06)" stroke="rgba(180,180,180,0.1)" strokeWidth="1"/>}
                    {wz.type==="wind" && mapZoom > 0.8 && <path d={`M${wz.x-wz.r*0.8},${wz.y} Q${wz.x},${wz.y-30} ${wz.x+wz.r*0.8},${wz.y}`} stroke="rgba(180,180,180,0.15)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>}
                    {mapZoom > 1.2 && <text x={wz.x} y={wz.y} textAnchor="middle" fill="var(--text-faint)" fontFamily="'Spectral', serif" fontSize="9" fontStyle="italic" opacity="0.5">{wz.type}</text>}
                  </g>
                ))}

                {/* ═══ LAYER 8: Encounter zones — visible at local zoom+ ═══ */}
                {mapZoom > 1.8 && encounterZones().map(ez => (
                  <g key={ez.key} opacity="0.25" style={{cursor:"pointer"}} onClick={(e)=>{e.stopPropagation();setSel({...ez,id:ez.id});setSelType("encounter");}}>
                    <circle cx={ez.x} cy={ez.y} r={ez.r} fill="rgba(192,57,43,0.04)" stroke="rgba(192,57,43,0.2)" strokeWidth="1" strokeDasharray="6,4"/>
                    {mapZoom > 2.5 && <>
                      <text x={ez.x} y={ez.y-8} textAnchor="middle" fill="var(--crimson)" fontFamily="'Cinzel', serif" fontSize="7" letterSpacing="1" opacity="0.6" style={{textTransform:"uppercase"}}>{ez.type}</text>
                      <text x={ez.x} y={ez.y+6} textAnchor="middle" fill="var(--text-muted)" fontFamily="'Spectral', serif" fontSize="8" fontStyle="italic" opacity="0.5">CR {ez.cr}</text>
                    </>}
                    {mapZoom > 3 && <text x={ez.x} y={ez.y+18} textAnchor="middle" fill="var(--text-faint)" fontFamily="'Spectral', serif" fontSize="7" opacity="0.4">{ez.name}</text>}
                  </g>
                ))}

                {/* ═══ LAYER 9: Travel route overlay ═══ */}
                {travelMode && travelFrom && travelTo && (
                  <g>
                    <line x1={travelFrom.mx} y1={travelFrom.my} x2={travelTo.mx} y2={travelTo.my} stroke="var(--crimson)" strokeWidth="3" strokeDasharray="12,8" opacity="0.6"/>
                    <circle cx={travelFrom.mx} cy={travelFrom.my} r="12" fill="var(--crimson)" opacity="0.3"/>
                    <circle cx={travelTo.mx} cy={travelTo.my} r="12" fill="var(--crimson)" opacity="0.3"/>
                    {travelInfo && (
                      <g transform={`translate(${(travelFrom.mx+travelTo.mx)/2},${(travelFrom.my+travelTo.my)/2-30})`}>
                        <rect x="-70" y="-20" width="140" height="40" rx="3" fill="var(--bg-card)" stroke="var(--crimson-border)" strokeWidth="1" opacity="0.95"/>
                        <text x="0" y="-4" textAnchor="middle" fill="var(--crimson)" fontFamily="'Cinzel', serif" fontSize="10" fontWeight="500">{travelInfo.leagues} leagues</text>
                        <text x="0" y="10" textAnchor="middle" fill="var(--text-muted)" fontFamily="'Spectral', serif" fontSize="8">{travelInfo.daysWalk}d walk · {travelInfo.daysHorse}d mounted</text>
                      </g>
                    )}
                  </g>
                )}

                {/* ═══ LAYER 10: Compass rose ═══ */}
                <g transform={`translate(${MAP_W-200},${MAP_H-200})`} opacity="0.3">
                  <line x1="0" y1="-55" x2="0" y2="55" stroke="var(--text-faint)" strokeWidth="2"/>
                  <line x1="-55" y1="0" x2="55" y2="0" stroke="var(--text-faint)" strokeWidth="2"/>
                  <line x1="-35" y1="-35" x2="35" y2="35" stroke="var(--text-faint)" strokeWidth="0.8"/>
                  <line x1="35" y1="-35" x2="-35" y2="35" stroke="var(--text-faint)" strokeWidth="0.8"/>
                  <polygon points="0,-60 -7,-40 7,-40" fill="var(--crimson)"/>
                  <polygon points="0,60 -5,42 5,42" fill="var(--text-faint)"/>
                  <text x="0" y="-68" textAnchor="middle" fill="var(--text-muted)" fontFamily="'Cinzel', serif" fontSize="14" fontWeight="600">N</text>
                  <text x="68" y="5" textAnchor="middle" fill="var(--text-faint)" fontFamily="'Cinzel', serif" fontSize="10">E</text>
                  <text x="-68" y="5" textAnchor="middle" fill="var(--text-faint)" fontFamily="'Cinzel', serif" fontSize="10">W</text>
                  <text x="0" y="80" textAnchor="middle" fill="var(--text-faint)" fontFamily="'Cinzel', serif" fontSize="10">S</text>
                </g>

                {/* Map title cartouche */}
                <g transform="translate(300,130)">
                  <rect x="-140" y="-35" width="280" height="55" rx="4" fill="var(--bg-card)" stroke="var(--crimson-border)" strokeWidth="1.5" opacity="0.92"/>
                  <line x1="-120" y1="-15" x2="120" y2="-15" stroke="var(--crimson-border)" strokeWidth="0.5" opacity="0.4"/>
                  <text x="0" y="-2" textAnchor="middle" fill="var(--crimson)" fontFamily="'Cinzel', serif" fontSize="15" fontWeight="600" letterSpacing="4" style={{ textTransform:"uppercase" }}>
                    {data.name || "The Realm"}
                  </text>
                  <line x1="-120" y1="8" x2="120" y2="8" stroke="var(--crimson-border)" strokeWidth="0.5" opacity="0.4"/>
                </g>

                {/* Scale bar — visible at kingdom zoom+ */}
                {mapZoom > 0.5 && (
                  <g transform={`translate(${MAP_W-500},${MAP_H-80})`} opacity="0.3">
                    <line x1="0" y1="0" x2="200" y2="0" stroke="var(--text-faint)" strokeWidth="2"/>
                    <line x1="0" y1="-6" x2="0" y2="6" stroke="var(--text-faint)" strokeWidth="1.5"/>
                    <line x1="200" y1="-6" x2="200" y2="6" stroke="var(--text-faint)" strokeWidth="1.5"/>
                    <line x1="100" y1="-4" x2="100" y2="4" stroke="var(--text-faint)" strokeWidth="1"/>
                    <text x="100" y="18" textAnchor="middle" fill="var(--text-faint)" fontFamily="'Spectral', serif" fontSize="10">100 leagues</text>
                  </g>
                )}
              </g>
            </svg>

            {/* Zoom level indicator */}
            <div style={{ position:"absolute", top:12, right:12, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, pointerEvents:"none" }}>
              <div style={{ padding:"6px 14px", background:T.bgCard, border:`1px solid ${T.crimsonBorder}`, borderRadius:"3px", fontFamily:T.ui, fontSize:8, color:T.crimson, letterSpacing:"2px", textTransform:"uppercase", opacity:0.85 }}>
                {zoomLevel} view
              </div>
              {mapZoom > 1.5 && <div style={{ padding:"4px 10px", background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:"2px", fontFamily:T.body, fontSize:9, color:T.textMuted, fontStyle:"italic", opacity:0.7 }}>
                {pois.length} points of interest
              </div>}
            </div>

            {/* Minimap overlay — always visible when zoomed past continent */}
            {mapZoom > 0.5 && (
              <div style={{ position:"absolute", bottom:12, left:12, width:200, height:150, background:T.bgCard, border:`1px solid ${T.crimsonBorder}`, borderRadius:"3px", overflow:"hidden", opacity:0.88 }}>
                <svg width="200" height="150" viewBox={`0 0 ${MAP_W} ${MAP_H}`}>
                  <rect width={MAP_W} height={MAP_H} fill="var(--bg-card)" opacity="0.5"/>
                  {/* Territory fills */}
                  {territories().map((t,i) => <path key={`mt-${i}`} d={t.path} fill={t.color} opacity="0.12"/>)}
                  {/* Region dots */}
                  {mapRegions.map(r => <circle key={r.id} cx={r.mx} cy={r.my} r={(r.type==="city"||r.type==="kingdom")?30:18} fill={tCols[r.threat]||"var(--text-muted)"} opacity="0.5"/>)}
                  {/* Viewport indicator */}
                  {(() => {
                    const rect = mapRef.current?.getBoundingClientRect();
                    if(!rect) return null;
                    const vx = -mapPan.x / mapZoom, vy = -mapPan.y / mapZoom;
                    const vw = rect.width / mapZoom, vh = rect.height / mapZoom;
                    return <rect x={vx} y={vy} width={vw} height={vh} fill="none" stroke="var(--crimson)" strokeWidth="8" opacity="0.65" rx="4"/>;
                  })()}
                </svg>
              </div>
            )}

            {/* Travel info panel */}
            {travelMode && (
              <div style={{ position:"absolute", bottom:12, right:12, width:240, background:T.bgCard, border:`1px solid ${T.crimsonBorder}`, borderRadius:"4px", padding:16, opacity:0.95 }}>
                <div style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"2px", color:T.crimson, textTransform:"uppercase", marginBottom:10 }}>Travel Planner</div>
                <div style={{ fontSize:12, color:T.textMuted, marginBottom:6 }}>
                  From: <span style={{color:T.text}}>{travelFrom?.name || "Click a settlement"}</span>
                </div>
                <div style={{ fontSize:12, color:T.textMuted, marginBottom:10 }}>
                  To: <span style={{color:T.text}}>{travelTo?.name || "Click another settlement"}</span>
                </div>
                {travelInfo && <>
                  <div style={{ padding:10, background:T.bg, border:`1px solid ${T.border}`, borderRadius:"2px", marginBottom:8 }}>
                    <div style={{ fontSize:14, color:T.crimson, fontFamily:T.ui, marginBottom:4 }}>{travelInfo.leagues} leagues</div>
                    <div style={{ fontSize:11, color:T.textDim, marginBottom:2 }}>{travelInfo.daysWalk} days on foot</div>
                    <div style={{ fontSize:11, color:T.textDim, marginBottom:2 }}>{travelInfo.daysHorse} days mounted</div>
                    <div style={{ fontSize:11, color:T.textMuted }}>Danger: <Tag variant={travelInfo.danger==="extreme"?"critical":travelInfo.danger==="high"?"danger":travelInfo.danger==="medium"?"warning":"success"}>{travelInfo.danger}</Tag></div>
                  </div>
                </>}
                <button onClick={()=>{setTravelFrom(null);setTravelTo(null);}} style={{ padding:"4px 10px", background:"transparent", border:`1px solid ${T.border}`, color:T.textMuted, fontFamily:T.ui, fontSize:8, letterSpacing:"1px", textTransform:"uppercase", cursor:"pointer", borderRadius:"2px", width:"100%" }}>Clear Route</button>
              </div>
            )}
          </div>
        )}

        {/* ══════════ LIST TABS (regions / factions / npcs) ══════════ */}
        {tab!=="map" && (
          <div style={{ flex:1, overflowY:"auto", padding:"24px 48px" }}>
            {tab==="regions" && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                {data.regions.map(r => {
                  const FantasyIcon = getFantasyIcon(r.type);
                  const active=sel?.id===r.id&&selType==="region";
                  return (
                    <div key={r.id} onClick={()=>{setSel(r);setSelType("region");setEditing(false);}} style={{
                      background:active?T.bgHover:T.bgCard, padding:20, cursor:"pointer",
                      border:`1px solid ${active?T.crimsonBorder:T.border}`, borderRadius:"4px",
                      boxShadow:"0 2px 8px rgba(0,0,0,0.08)", transition:"all 0.2s",
                    }}>
                      <div style={{ display:"flex", alignItems:"start", gap:14 }}>
                        <div style={{ flexShrink:0, marginTop:-2, opacity:0.85 }}>
                          <FantasyIcon size={r.type==="city"||r.type==="kingdom"||r.type==="capital"?36:28} color={tCols[r.threat]} />
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:15, fontWeight:300, color:T.text, marginBottom:8 }}>{r.name}</div>
                          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
                            <Tag variant={r.threat==="extreme"?"critical":r.threat==="high"?"danger":r.threat==="medium"?"warning":"success"}>{r.threat}</Tag>
                            <Tag variant="muted">{r.type}</Tag>
                            {r.visited && <Tag variant="info">visited</Tag>}
                          </div>
                          <div style={{ fontSize:12, color:T.textMuted, fontWeight:300 }}>{r.ctrl} — <span style={{fontStyle:"italic"}}>{r.state}</span></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {tab==="factions" && (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {data.factions.map(f => {
                  const active=sel?.id===f.id&&selType==="faction";
                  return (
                    <div key={f.id} onClick={()=>{setSel(f);setSelType("faction");setEditing(false);}} style={{
                      background:active?T.bgHover:T.bgCard, padding:24, cursor:"pointer",
                      border:`1px solid ${active?T.crimsonBorder:T.border}`, borderRadius:"4px",
                      borderLeft:`4px solid ${f.color}`, boxShadow:"0 2px 8px rgba(0,0,0,0.08)", transition:"all 0.2s",
                    }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                        <span style={{ fontSize:18, fontWeight:300, color:T.text }}>{f.name}</span>
                        <Tag variant={f.attitude==="allied"||f.attitude==="friendly"?"success":f.attitude==="hostile"?"danger":"muted"}>{f.attitude}</Tag>
                        {f.trend==="rising"?<TrendingUp size={12} color={T.crimson}/>:f.trend==="declining"?<TrendingDown size={12} color="#6fcf97"/>:<Minus size={12} color={T.textFaint}/>}
                      </div>
                      <p style={{ fontSize:13, color:T.textDim, margin:"0 0 10px", fontWeight:300, fontStyle:"italic" }}>{f.desc}</p>
                      <div style={{ display:"flex", alignItems:"center", gap:10, maxWidth:300 }}>
                        <span style={{ fontFamily:T.ui, fontSize:8, color:T.textFaint, letterSpacing:"1.5px" }}>PWR</span>
                        <div style={{flex:1}}><PowerBar val={f.power} max={100} color={f.color}/></div>
                        <span style={{ fontSize:12, color:T.textMuted }}>{f.power}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {tab==="npcs" && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                {data.npcs.map(n => {
                  const active=sel?.id===n.id&&selType==="npc";
                  return (
                    <div key={n.id} onClick={()=>{setSel(n);setSelType("npc");setEditing(false);}} style={{
                      background:active?T.bgHover:T.bgCard, padding:20, cursor:"pointer", opacity:n.alive?1:0.45,
                      border:`1px solid ${active?T.crimsonBorder:T.border}`, borderRadius:"4px",
                      boxShadow:"0 2px 8px rgba(0,0,0,0.08)", transition:"all 0.2s",
                    }}>
                      <div style={{ display:"flex", alignItems:"start", gap:10 }}>
                        {n.alive?<Users size={14} color={T.textFaint}/>:<Skull size={14} color={T.crimson}/>}
                        <div>
                          <div style={{ fontSize:15, fontWeight:300, color:T.text, marginBottom:4 }}>{n.name}</div>
                          <div style={{ fontSize:12, color:T.textFaint, marginBottom:8, fontStyle:"italic", fontWeight:300 }}>{n.role} — {n.loc}</div>
                          <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                            <Tag variant={n.attitude==="allied"||n.attitude==="friendly"?"success":n.attitude==="hostile"?"danger":n.attitude==="cautious"?"warning":"muted"}>{n.attitude}</Tag>
                            {n.faction && <Tag variant="muted">{n.faction}</Tag>}
                            {!n.alive && <Tag variant="danger">deceased</Tag>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════ DETAIL PANEL (right side) ══════════ */}
        <div style={{ width:sel?360:0, overflowY:"auto", overflowX:"hidden", transition:"width 0.25s ease", flexShrink:0, borderLeft:sel?`1px solid ${T.border}`:"none" }}>
          {sel && (
            <div style={{ padding:24, width:360 }}>
              <Section>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    {selType==="region" && (() => { const FI = getFantasyIcon(sel.type); return <FI size={28} color={T.crimson} />; })()}
                    <div style={{ fontSize:18, color:T.text, fontWeight:300 }}>{sel.name}</div>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={()=>setEditing(!editing)} style={{ background:"none", border:"none", cursor:"pointer", color:editing?T.crimson:T.textFaint }}><Edit3 size={14}/></button>
                    <button onClick={()=>setSel(null)} style={{ background:"none", border:"none", cursor:"pointer", color:T.textFaint }}><X size={14}/></button>
                  </div>
                </div>

                {editing ? (
                  <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
                    {selType==="faction" && <>
                      <Select value={sel.attitude} onChange={v=>{updateFaction(sel.id,{attitude:v});setSel(p=>({...p,attitude:v}));}} style={{ width:"100%" }}>
                        {["allied","friendly","neutral","cautious","hostile"].map(a=><option key={a} value={a}>{a}</option>)}
                      </Select>
                      <div>
                        <span style={{ fontFamily:T.ui, fontSize:8, color:T.textFaint, letterSpacing:"1px" }}>POWER: {sel.power}</span>
                        <input type="range" min="0" max="100" value={sel.power} onChange={e=>{const v=parseInt(e.target.value);updateFaction(sel.id,{power:v});setSel(p=>({...p,power:v}));}} style={{ width:"100%" }} />
                      </div>
                      <Select value={sel.trend} onChange={v=>{updateFaction(sel.id,{trend:v});setSel(p=>({...p,trend:v}));}} style={{ width:"100%" }}>
                        {["rising","stable","declining"].map(t=><option key={t} value={t}>{t}</option>)}
                      </Select>
                    </>}
                    {selType==="region" && <>
                      <Select value={sel.type} onChange={v=>{updateRegion(sel.id,{type:v});setSel(p=>({...p,type:v}));}} style={{ width:"100%" }}>
                        {["city","town","hamlet","kingdom","castle","wilderness","forest","mountain","dungeon","ruins","route"].map(t=><option key={t} value={t}>{t}</option>)}
                      </Select>
                      <Select value={sel.threat} onChange={v=>{updateRegion(sel.id,{threat:v});setSel(p=>({...p,threat:v}));}} style={{ width:"100%" }}>
                        {["low","medium","high","extreme"].map(t=><option key={t} value={t}>{t}</option>)}
                      </Select>
                      <Input value={sel.state} onChange={v=>{updateRegion(sel.id,{state:v});setSel(p=>({...p,state:v}));}} placeholder="State" />
                      <ToggleSwitch on={sel.visited} onToggle={()=>{updateRegion(sel.id,{visited:!sel.visited});setSel(p=>({...p,visited:!p.visited}));}} label="Visited" />
                    </>}
                    {selType==="npc" && <>
                      <Select value={sel.attitude} onChange={v=>{updateNpc(sel.id,{attitude:v});setSel(p=>({...p,attitude:v}));}} style={{ width:"100%" }}>
                        {["allied","friendly","neutral","cautious","hostile"].map(a=><option key={a} value={a}>{a}</option>)}
                      </Select>
                      <Input value={sel.loc} onChange={v=>{updateNpc(sel.id,{loc:v});setSel(p=>({...p,loc:v}));}} placeholder="Location" />
                      <Input value={sel.role} onChange={v=>{updateNpc(sel.id,{role:v});setSel(p=>({...p,role:v}));}} placeholder="Role" />
                      <ToggleSwitch on={sel.alive} onToggle={()=>{updateNpc(sel.id,{alive:!sel.alive});setSel(p=>({...p,alive:!p.alive}));}} label="Alive" />
                    </>}
                  </div>
                ) : (
                  <div style={{ padding:14, background:T.bg, border:`1px solid ${T.crimsonBorder}`, borderRadius:"2px", marginBottom:20 }}>
                    {selType==="region" && <>
                      <div style={{ fontSize:12, color:T.textMuted, marginBottom:6 }}>Type: <span style={{color:T.textDim}}>{sel.type}</span></div>
                      <div style={{ fontSize:12, color:T.textMuted, marginBottom:6 }}>State: <span style={{color:T.textDim,fontStyle:"italic"}}>{sel.state}</span></div>
                      <div style={{ fontSize:12, color:T.textMuted }}>Threat: <Tag variant={sel.threat==="extreme"?"critical":sel.threat==="high"?"danger":sel.threat==="medium"?"warning":"success"}>{sel.threat}</Tag></div>
                    </>}
                    {selType==="faction" && <>
                      <p style={{ fontSize:13, color:T.textDim, margin:"0 0 10px", fontWeight:300, fontStyle:"italic" }}>{sel.desc}</p>
                      <div style={{ fontSize:12, color:T.textMuted, marginBottom:6 }}>Power: <span style={{color:T.textDim}}>{sel.power}/100</span></div>
                      <div style={{ fontSize:12, color:T.textMuted }}>Trend: <span style={{color:T.textDim}}>{sel.trend}</span></div>
                    </>}
                    {selType==="npc" && <>
                      <div style={{ fontSize:12, color:T.textMuted, marginBottom:6 }}>Role: <span style={{color:T.textDim}}>{sel.role}</span></div>
                      <div style={{ fontSize:12, color:T.textMuted, marginBottom:6 }}>Location: <span style={{color:T.textDim}}>{sel.loc}</span></div>
                      <div style={{ fontSize:12, color:T.textMuted }}>Status: <span style={{color:T.textDim}}>{sel.alive?"Alive":"Deceased"}</span></div>
                    </>}
                  </div>
                )}

                <SectionTitle icon={Layers}>Connections</SectionTitle>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {conns(selType,sel).map((c,i) => (
                    <div key={i} onClick={()=>{setSel(c.e);setSelType(c.type);setEditing(false);}} style={{
                      padding:"12px 14px", background:T.bg, cursor:"pointer", borderRadius:"2px",
                      border:`1px solid ${T.border}`, borderLeft:`3px solid ${c.type==="faction"?(c.e.color||T.crimson):T.textFaint}`,
                      transition:"all 0.15s",
                    }}>
                      <span style={{ fontFamily:T.ui, fontSize:7, color:T.textFaint, letterSpacing:"2px", textTransform:"uppercase", display:"block", marginBottom:3 }}>{c.label}</span>
                      <span style={{ fontSize:13, fontWeight:300, color:T.text }}>{c.e.name||c.e.title}</span>
                    </div>
                  ))}
                  {conns(selType,sel).length===0 && <p style={{ fontSize:12, color:T.textFaint, fontStyle:"italic", fontWeight:300 }}>No connections.</p>}
                </div>

                {/* POI details */}
                {selType==="poi" && !editing && (
                  <div style={{ padding:14, background:T.bg, border:`1px solid ${T.crimsonBorder}`, borderRadius:"2px", marginBottom:20 }}>
                    <div style={{ fontSize:12, color:T.textMuted, marginBottom:6 }}>Type: <span style={{color:T.textDim}}>{sel.type}</span></div>
                    <div style={{ fontSize:12, color:T.textMuted, marginBottom:6 }}>Threat: <Tag variant={sel.threat==="extreme"?"critical":sel.threat==="high"?"danger":sel.threat==="medium"?"warning":"success"}>{sel.threat}</Tag></div>
                    <div style={{ fontSize:12, color:T.textMuted, marginTop:10, fontStyle:"italic", fontWeight:300 }}>A mysterious point of interest awaiting exploration.</div>
                  </div>
                )}
                {/* Encounter zone details */}
                {selType==="encounter" && !editing && (
                  <div style={{ padding:14, background:T.bg, border:`1px solid ${T.crimsonBorder}`, borderRadius:"2px", marginBottom:20 }}>
                    <div style={{ fontSize:12, color:T.textMuted, marginBottom:6 }}>Type: <span style={{color:T.textDim}}>{sel.type}</span></div>
                    <div style={{ fontSize:12, color:T.textMuted, marginBottom:6 }}>Challenge: <Tag variant={sel.cr>10?"critical":sel.cr>7?"danger":sel.cr>3?"warning":"success"}>CR {sel.cr}</Tag></div>
                    <div style={{ fontSize:12, color:T.textMuted, marginBottom:6 }}>Name: <span style={{color:T.textDim,fontStyle:"italic"}}>{sel.name}</span></div>
                    <div style={{ fontSize:12, color:T.textMuted, marginTop:10, fontStyle:"italic", fontWeight:300 }}>An area known for dangerous encounters.</div>
                  </div>
                )}
              </Section>
            </div>
          )}
        </div>
      </div>

      {/* Add Entity Modal */}
      <AddEntityModal open={addingEntity} onClose={()=>setAddingEntity(false)} tab={tab==="map"?"regions":tab} onAdd={addEntity} data={data} />
    </div>
  );
}

function AddEntityModal({ open, onClose, tab, onAdd, data }) {
  const [form, setForm] = useState({});
  useEffect(() => {
    if (tab==="regions") setForm({ name:"", type:"town", ctrl:"", threat:"low", state:"stable", visited:false, terrain:"" });
    else if (tab==="factions") setForm({ name:"", attitude:"neutral", power:50, trend:"stable", desc:"", color:"#94a3b8" });
    else setForm({ name:"", faction:null, loc:"", attitude:"neutral", role:"", alive:true });
  }, [tab, open]);

  return (
    <Modal open={open} onClose={onClose} title={`Add ${tab.slice(0,-1)}`}>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <Input value={form.name||""} onChange={v=>setForm(p=>({...p,name:v}))} placeholder="Name" />
        {tab==="regions" && <>
          <Select value={form.type||"town"} onChange={v=>setForm(p=>({...p,type:v}))} style={{ width:"100%" }}>
            {["city","town","hamlet","kingdom","castle","wilderness","forest","mountain","dungeon","ruins","route"].map(t=><option key={t} value={t}>{t}</option>)}
          </Select>
          <Select value={form.ctrl||""} onChange={v=>setForm(p=>({...p,ctrl:v}))} style={{ width:"100%" }}>
            <option value="">No controller</option>
            {data.factions.map(f=><option key={f.id} value={f.name}>{f.name}</option>)}
          </Select>
          <Select value={form.threat||"low"} onChange={v=>setForm(p=>({...p,threat:v}))} style={{ width:"100%" }}>
            {["low","medium","high","extreme"].map(t=><option key={t} value={t}>{t}</option>)}
          </Select>
        </>}
        {tab==="factions" && <>
          <Textarea value={form.desc||""} onChange={v=>setForm(p=>({...p,desc:v}))} placeholder="Description..." rows={2} />
          <Select value={form.attitude||"neutral"} onChange={v=>setForm(p=>({...p,attitude:v}))} style={{ width:"100%" }}>
            {["allied","friendly","neutral","cautious","hostile"].map(a=><option key={a} value={a}>{a}</option>)}
          </Select>
        </>}
        {tab==="npcs" && <>
          <Input value={form.role||""} onChange={v=>setForm(p=>({...p,role:v}))} placeholder="Role (e.g., quest giver, ally)" />
          <Input value={form.loc||""} onChange={v=>setForm(p=>({...p,loc:v}))} placeholder="Location" />
          <Select value={form.faction||""} onChange={v=>setForm(p=>({...p,faction:v||null}))} style={{ width:"100%" }}>
            <option value="">No faction</option>
            {data.factions.map(f=><option key={f.id} value={f.name}>{f.name}</option>)}
          </Select>
          <Select value={form.attitude||"neutral"} onChange={v=>setForm(p=>({...p,attitude:v}))} style={{ width:"100%" }}>
            {["allied","friendly","neutral","cautious","hostile"].map(a=><option key={a} value={a}>{a}</option>)}
          </Select>
        </>}
        <CrimsonBtn onClick={()=>{if(form.name) onAdd(tab.slice(0,-1),form);}}><Plus size={12}/> Add</CrimsonBtn>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAY MODE
// ═══════════════════════════════════════════════════════════════════════════

// ─── BATTLEMAP (Canvas-based) ───────────────────────────────────────────────

function Battlemap({ party, npcs }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const fileRef = useRef(null);
  const [tool, setTool] = useState("select");
  const [gridSize, setGridSize] = useState(40);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({x:0,y:0});
  const [bgColor, setBgColor] = useState("#1a1a2e");
  const [bgImage, setBgImage] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [fogCells, setFogCells] = useState({});
  const [drawColor, setDrawColor] = useState("#dc143c");
  const [drawWidth, setDrawWidth] = useState(3);
  const [dragState, setDragState] = useState(null);
  const [drawPoints, setDrawPoints] = useState([]);
  const [rulerStart, setRulerStart] = useState(null);
  const [rulerEnd, setRulerEnd] = useState(null);

  const worldToCanvas = (wx, wy) => ({ x: wx * zoom + pan.x, y: wy * zoom + pan.y });
  const canvasToWorld = (cx, cy) => ({ x: (cx - pan.x) / zoom, y: (cy - pan.y) / zoom });

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Background image
    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0);
    }

    // Grid
    if (showGrid) {
      ctx.strokeStyle = "rgba(192,57,43,0.15)"; // subtle grid lines — fixed color is fine
      ctx.lineWidth = 0.5;
      const gw = bgImage ? bgImage.width : w / zoom;
      const gh = bgImage ? bgImage.height : h / zoom;
      const startX = 0, startY = 0;
      for (let x = startX; x <= gw; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, gh); ctx.stroke();
      }
      for (let y = startY; y <= gh; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(gw, y); ctx.stroke();
      }
    }

    // Drawings
    drawings.forEach(d => {
      if (d.points.length < 2) return;
      ctx.strokeStyle = d.color;
      ctx.lineWidth = d.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(d.points[0].x, d.points[0].y);
      d.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });

    // Fog of war
    Object.entries(fogCells).forEach(([key, val]) => {
      if (!val) return;
      const [gx, gy] = key.split(",").map(Number);
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(gx * gridSize, gy * gridSize, gridSize, gridSize);
    });

    // Tokens
    tokens.forEach(t => {
      const r = gridSize * 0.4;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fillStyle = t.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();
      // Label
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(9, gridSize * 0.22)}px Cinzel`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = t.name.length > 3 ? t.name.substring(0,3) : t.name;
      ctx.fillText(label, t.x, t.y);
      // HP bar under token
      if (t.hp != null && t.maxHp) {
        const barW = gridSize * 0.7, barH = 4;
        const barX = t.x - barW/2, barY = t.y + r + 4;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = t.hp < t.maxHp * 0.3 ? "#c0392b" : t.hp < t.maxHp * 0.6 ? "#d97706" : "#2d6a4f";
        ctx.fillRect(barX, barY, barW * (t.hp / t.maxHp), barH);
      }
    });

    ctx.restore();

    // Ruler overlay (drawn in screen space)
    if (tool === "ruler" && rulerStart && rulerEnd) {
      const rulerColor = cssVar("--crimson");
      ctx.strokeStyle = rulerColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      const s = worldToCanvas(rulerStart.x, rulerStart.y);
      const e = worldToCanvas(rulerEnd.x, rulerEnd.y);
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
      ctx.setLineDash([]);
      const dist = Math.sqrt((rulerEnd.x - rulerStart.x) ** 2 + (rulerEnd.y - rulerStart.y) ** 2);
      const ft = Math.round(dist / gridSize * 5);
      ctx.fillStyle = rulerColor;
      ctx.font = "bold 12px Cinzel";
      ctx.fillText(`${ft} ft`, (s.x + e.x) / 2, (s.y + e.y) / 2 - 8);
    }
  }, [bgColor, bgImage, showGrid, gridSize, zoom, pan, drawings, fogCells, tokens, tool, rulerStart, rulerEnd, drawPoints]);

  useEffect(() => { render(); }, [render]);

  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      canvas.width = wrap.clientWidth;
      canvas.height = wrap.clientHeight;
      render();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [render]);

  const getMouseWorld = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    return canvasToWorld(cx, cy);
  };

  const handleMouseDown = (e) => {
    const w = getMouseWorld(e);
    if (tool === "select") {
      const hit = [...tokens].reverse().find(t => Math.hypot(t.x - w.x, t.y - w.y) < gridSize * 0.4);
      if (hit) setDragState({ type: "token", id: hit.id, offsetX: w.x - hit.x, offsetY: w.y - hit.y });
      else setDragState({ type: "pan", startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y });
    } else if (tool === "draw") {
      setDrawPoints([{ x: w.x, y: w.y }]);
    } else if (tool === "fog") {
      const gx = Math.floor(w.x / gridSize), gy = Math.floor(w.y / gridSize);
      const key = `${gx},${gy}`;
      setFogCells(p => ({ ...p, [key]: !p[key] }));
      setDragState({ type: "fog", adding: !fogCells[`${gx},${gy}`] });
    } else if (tool === "ruler") {
      setRulerStart(w);
      setRulerEnd(w);
    } else if (tool === "eraser") {
      const hit = [...tokens].reverse().find(t => Math.hypot(t.x - w.x, t.y - w.y) < gridSize * 0.4);
      if (hit) setTokens(p => p.filter(t => t.id !== hit.id));
    }
  };

  const handleMouseMove = (e) => {
    if (!dragState && tool !== "draw" && tool !== "ruler") return;
    const w = getMouseWorld(e);
    if (dragState?.type === "token") {
      setTokens(p => p.map(t => t.id === dragState.id ? { ...t, x: w.x - dragState.offsetX, y: w.y - dragState.offsetY } : t));
    } else if (dragState?.type === "pan") {
      setPan({ x: dragState.panX + (e.clientX - dragState.startX), y: dragState.panY + (e.clientY - dragState.startY) });
    } else if (tool === "draw" && drawPoints.length > 0) {
      setDrawPoints(p => [...p, { x: w.x, y: w.y }]);
    } else if (dragState?.type === "fog") {
      const gx = Math.floor(w.x / gridSize), gy = Math.floor(w.y / gridSize);
      setFogCells(p => ({ ...p, [`${gx},${gy}`]: dragState.adding }));
    } else if (tool === "ruler" && rulerStart) {
      setRulerEnd(w);
    }
  };

  const handleMouseUp = () => {
    if (tool === "draw" && drawPoints.length > 1) {
      setDrawings(p => [...p, { points: drawPoints, color: drawColor, width: drawWidth }]);
    }
    setDrawPoints([]);
    setDragState(null);
    if (tool === "ruler") { setRulerStart(null); setRulerEnd(null); }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.max(0.25, Math.min(4, z + delta)));
  };

  const handleMapUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => setBgImage(img);
    img.src = URL.createObjectURL(file);
  };

  const addToken = (name, color, hp, maxHp) => {
    const cx = (canvasRef.current?.width / 2 - pan.x) / zoom;
    const cy = (canvasRef.current?.height / 2 - pan.y) / zoom;
    const snappedX = Math.floor(cx / gridSize) * gridSize + gridSize / 2;
    const snappedY = Math.floor(cy / gridSize) * gridSize + gridSize / 2;
    setTokens(p => [...p, { id: `tk-${Date.now()}-${Math.random()}`, name, color, hp, maxHp, x: snappedX, y: snappedY }]);
  };

  const tools = [
    { id:"select", label:"Select" }, { id:"draw", label:"Draw" },
    { id:"fog", label:"Fog" }, { id:"ruler", label:"Ruler" }, { id:"eraser", label:"Eraser" },
  ];
  const bgPresets = [
    { c:"#1a1a2e", l:"Dark" }, { c:"#2d4a2d", l:"Forest" }, { c:"#3a3020", l:"Cave" },
    { c:"#1a3a4a", l:"Water" }, { c:"#5a4a3a", l:"Sand" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", flex:1, minHeight:0 }}>
      {/* Toolbar */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:3, padding:"6px 10px", background:T.bg, borderBottom:`1px solid ${T.crimsonBorder}`, alignItems:"center" }}>
        <div style={{ display:"inline-flex", gap:2, padding:2, background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:"3px" }}>
          {tools.map(t => (
            <button key={t.id} onClick={()=>setTool(t.id)} style={{
              padding:"5px 9px", background:tool===t.id?T.crimson:"transparent", border:"1px solid transparent",
              color:tool===t.id?T.text:T.textMuted, fontFamily:T.ui, fontSize:8, letterSpacing:"1px",
              textTransform:"uppercase", cursor:"pointer", borderRadius:"2px", fontWeight:500, transition:"all 0.15s",
            }}>{t.label}</button>
          ))}
        </div>
        <div style={{ width:1, height:22, background:T.border, margin:"0 3px" }}/>
        <input type="color" value={drawColor} onChange={e=>setDrawColor(e.target.value)} style={{ width:24, height:24, border:`1px solid ${T.border}`, background:"none", padding:0, cursor:"pointer", borderRadius:"2px" }} />
        <select value={drawWidth} onChange={e=>setDrawWidth(parseInt(e.target.value))} style={{ padding:"3px 4px", fontSize:10, fontFamily:T.ui, background:T.bgCard, border:`1px solid ${T.border}`, color:T.textMuted, borderRadius:"2px" }}>
          <option value="2">Thin</option><option value="3">Med</option><option value="6">Thick</option><option value="10">Bold</option>
        </select>
        <div style={{ width:1, height:22, background:T.border, margin:"0 3px" }}/>
        <button onClick={()=>setShowGrid(!showGrid)} style={{ padding:"5px 9px", background:showGrid?T.crimsonSoft:"transparent", border:`1px solid ${showGrid?T.crimsonBorder:"transparent"}`, color:showGrid?T.crimson:T.textMuted, fontFamily:T.ui, fontSize:8, letterSpacing:"1px", textTransform:"uppercase", cursor:"pointer", borderRadius:"2px", fontWeight:500 }}>Grid</button>
        <button onClick={()=>setZoom(z=>Math.min(4,z+0.25))} style={{ padding:"5px 8px", background:"transparent", border:`1px solid ${T.border}`, color:T.textMuted, fontSize:14, cursor:"pointer", borderRadius:"2px" }}>+</button>
        <span style={{ fontFamily:T.ui, fontSize:10, color:T.textMuted, letterSpacing:"1px", minWidth:36, textAlign:"center" }}>{Math.round(zoom*100)}%</span>
        <button onClick={()=>setZoom(z=>Math.max(0.25,z-0.25))} style={{ padding:"5px 8px", background:"transparent", border:`1px solid ${T.border}`, color:T.textMuted, fontSize:14, cursor:"pointer", borderRadius:"2px" }}>−</button>
        <button onClick={()=>{setZoom(1);setPan({x:0,y:0});}} style={{ padding:"5px 9px", background:"transparent", border:`1px solid ${T.border}`, color:T.textMuted, fontFamily:T.ui, fontSize:8, letterSpacing:"1px", textTransform:"uppercase", cursor:"pointer", borderRadius:"2px", fontWeight:500 }}>Reset</button>
        <div style={{ width:1, height:22, background:T.border, margin:"0 3px" }}/>
        <button onClick={()=>setFogCells({})} style={{ padding:"5px 9px", background:"transparent", border:`1px solid ${T.border}`, color:T.textMuted, fontFamily:T.ui, fontSize:8, letterSpacing:"1px", textTransform:"uppercase", cursor:"pointer", borderRadius:"2px", fontWeight:500 }}>Reveal</button>
        <button onClick={()=>{setDrawings([]);setTokens([]);setFogCells({});}} style={{ padding:"5px 9px", background:"transparent", border:`1px solid ${T.border}`, color:T.textMuted, fontFamily:T.ui, fontSize:8, letterSpacing:"1px", textTransform:"uppercase", cursor:"pointer", borderRadius:"2px", fontWeight:500 }}>Clear</button>
      </div>

      <div style={{ display:"flex", flex:1, minHeight:0 }}>
        {/* Canvas */}
        <div ref={wrapRef} style={{ flex:1, position:"relative", overflow:"hidden", background:bgColor, boxShadow:"inset 0 2px 8px rgba(0,0,0,0.4)", cursor:tool==="select"?"grab":tool==="draw"?"crosshair":"default" }}>
          <canvas ref={canvasRef} style={{ display:"block", width:"100%", height:"100%", position:"absolute", top:0, left:0 }}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel} />
          <input type="file" ref={fileRef} style={{display:"none"}} accept="image/*" onChange={handleMapUpload} />
        </div>

        {/* Sidebar */}
        <div style={{ width:220, background:T.bgCard, overflowY:"auto", padding:14, display:"flex", flexDirection:"column", gap:14, borderLeft:`1px solid ${T.crimsonBorder}` }}>
          <div>
            <span style={{ fontFamily:T.ui, fontSize:9, letterSpacing:"2px", color:T.crimson, textTransform:"uppercase", display:"block", marginBottom:6, paddingBottom:5, borderBottom:`1px solid ${T.crimsonBorder}` }}>Map Background</span>
            <div onClick={()=>fileRef.current?.click()} style={{ width:"100%", padding:10, background:T.bg, border:`1px dashed ${T.border}`, borderRadius:"2px", cursor:"pointer", fontSize:11, color:T.textMuted, textAlign:"center", transition:"all 0.15s" }}>
              {bgImage ? "Replace Map Image" : "Upload Map Image"}
            </div>
            <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:8 }}>
              {bgPresets.map(p => (
                <button key={p.c} onClick={()=>setBgColor(p.c)} style={{ padding:"3px 7px", background:bgColor===p.c?T.crimsonSoft:"transparent", border:`1px solid ${bgColor===p.c?T.crimsonBorder:T.border}`, color:bgColor===p.c?T.crimson:T.textMuted, fontFamily:T.ui, fontSize:7, letterSpacing:"0.5px", cursor:"pointer", borderRadius:"2px", textTransform:"uppercase" }}>{p.l}</button>
              ))}
            </div>
            <div style={{ display:"flex", gap:6, alignItems:"center", marginTop:6 }}>
              <span style={{ fontFamily:T.ui, fontSize:7, color:T.textMuted, letterSpacing:"1px" }}>GRID</span>
              <select value={gridSize} onChange={e=>setGridSize(parseInt(e.target.value))} style={{ padding:"3px 4px", fontSize:10, fontFamily:T.ui, background:T.bgCard, border:`1px solid ${T.border}`, color:T.textMuted, borderRadius:"2px", flex:1 }}>
                <option value="20">Tiny</option><option value="30">Small</option><option value="40">Medium</option><option value="50">Large</option><option value="60">XL</option>
              </select>
            </div>
          </div>

          <div>
            <span style={{ fontFamily:T.ui, fontSize:9, letterSpacing:"2px", color:T.crimson, textTransform:"uppercase", display:"block", marginBottom:6, paddingBottom:5, borderBottom:`1px solid ${T.crimsonBorder}` }}>Add Tokens</span>
            {party.map(p => (
              <div key={p.id} onClick={()=>addToken(p.name,"#2d6a4f",p.hp,p.maxHp)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 10px", background:T.bg, border:`1px solid ${T.border}`, borderRadius:"2px", cursor:"pointer", marginBottom:3, transition:"all 0.15s" }}>
                <div>
                  <div style={{ fontSize:12, color:T.text }}>{p.name}</div>
                  <div style={{ fontSize:10, color:T.textMuted }}>PC · {p.hp}/{p.maxHp}</div>
                </div>
                <Plus size={12} color={T.crimson}/>
              </div>
            ))}
            <div onClick={()=>{const n=prompt("Token name:");if(n)addToken(n,cssVar("--crimson"),null,null);}} style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:4, padding:"7px 10px", background:T.bg, border:`1px dashed ${T.border}`, borderRadius:"2px", cursor:"pointer", marginTop:4, fontSize:10, color:T.textMuted, fontFamily:T.ui, letterSpacing:"1px", textTransform:"uppercase" }}>
              <Plus size={10}/> Enemy Token
            </div>
          </div>

          <div>
            <span style={{ fontFamily:T.ui, fontSize:9, letterSpacing:"2px", color:T.crimson, textTransform:"uppercase", display:"block", marginBottom:6, paddingBottom:5, borderBottom:`1px solid ${T.crimsonBorder}` }}>On Map ({tokens.length})</span>
            {tokens.map(t => (
              <div key={t.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 8px", background:T.bg, border:`1px solid ${T.border}`, borderRadius:"2px", marginBottom:2, fontSize:11, color:T.text }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:t.color, flexShrink:0 }}/>
                  <span>{t.name.length>12?t.name.substring(0,12)+"...":t.name}</span>
                </div>
                <button onClick={()=>setTokens(p=>p.filter(tk=>tk.id!==t.id))} style={{ background:"none", border:"none", cursor:"pointer", color:T.textFaint, padding:0 }}><X size={10}/></button>
              </div>
            ))}
            {tokens.length===0 && <div style={{ fontSize:10, color:T.textFaint, fontStyle:"italic", padding:4 }}>No tokens placed</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayView({ data, setData }) {
  const [panel, setPanel] = useState("initiative");
  const [mode, setMode] = useState("battlemap");
  const [activeTab, setActiveTab] = useState("combat");
  const [conditions, setConditions] = useState({});
  const [lootHistory, setLootHistory] = useState([]);
  const [encounter, setEncounter] = useState({ monsters: [], round: 0, deathSaves: {} });
  const [refPanelOpen, setRefPanelOpen] = useState(false);

  const D5E_CONDITIONS = [
    "Blinded", "Charmed", "Deafened", "Frightened", "Grappled",
    "Incapacitated", "Invisible", "Paralyzed", "Petrified", "Poisoned",
    "Prone", "Restrained", "Stunned", "Unconscious", "Exhaustion"
  ];

  const TREASURE_TABLES = {
    "0-4": [
      { item: "Copper pieces", rarity: "common", value: "2d6 x 10" },
      { item: "Silk handkerchief", rarity: "common", value: "1 gp" },
      { item: "Rope (50 ft)", rarity: "common", value: "1 gp" },
      { item: "+1 Dagger", rarity: "uncommon", value: "50 gp" },
      { item: "Potion of Healing", rarity: "uncommon", value: "25 gp" },
    ],
    "5-10": [
      { item: "Gold pieces", rarity: "common", value: "3d6 x 100" },
      { item: "Bracers of Archery", rarity: "uncommon", value: "500 gp" },
      { item: "Ring of Protection", rarity: "rare", value: "2000 gp" },
      { item: "Bag of Holding", rarity: "rare", value: "2500 gp" },
      { item: "Boots of Speed", rarity: "rare", value: "3000 gp" },
    ],
    "11-16": [
      { item: "Platinum pieces", rarity: "common", value: "2d4 x 1000" },
      { item: "Cloak of Invisibility", rarity: "rare", value: "6000 gp" },
      { item: "Staff of Fire", rarity: "rare", value: "5000 gp" },
      { item: "Helm of Telepathy", rarity: "very rare", value: "12000 gp" },
      { item: "Amulet of Health", rarity: "rare", value: "5500 gp" },
    ],
    "17+": [
      { item: "Dragon hoard gold", rarity: "common", value: "5d8 x 1000" },
      { item: "Robe of the Archmagi", rarity: "legendary", value: "25000 gp" },
      { item: "Staff of Power", rarity: "very rare", value: "18000 gp" },
      { item: "Ring of True Invisibility", rarity: "legendary", value: "20000 gp" },
    ],
  };

  const generateLoot = (cr) => {
    const crRange = cr <= 4 ? "0-4" : cr <= 10 ? "5-10" : cr <= 16 ? "11-16" : "17+";
    const table = TREASURE_TABLES[crRange];
    const item = table[Math.floor(Math.random() * table.length)];
    const gold = Math.floor(Math.random() * 100 + 50);
    const loot = { id: uid(), ...item, gold, addedAt: new Date().toLocaleTimeString() };
    setLootHistory(prev => [...prev, loot]);
    return loot;
  };

  const getRarityColor = (rarity) => {
    const map = {
      "common": "#808080",
      "uncommon": "#2d6a4f",
      "rare": "#4a90e2",
      "very rare": "#9b59b6",
      "legendary": "#e67e22",
    };
    return map[rarity] || "#666";
  };

  const addCondition = (charId, condition, duration = 0) => {
    setConditions(prev => ({
      ...prev,
      [charId]: [...(prev[charId] || []), { name: condition, duration, addedAt: new Date() }]
    }));
  };

  const removeCondition = (charId, index) => {
    setConditions(prev => ({
      ...prev,
      [charId]: prev[charId].filter((_, i) => i !== index)
    }));
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 430px", gap:0, padding:0, height:"calc(100vh - 56px)" }}>
      <div style={{ display:"flex", flexDirection:"column", minHeight:0 }}>
        {/* Main header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 24px", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div>
              <div style={{ fontSize:24, color:T.text, fontWeight:300 }}>Play Mode</div>
              <p style={{ fontSize:11, color:T.textMuted, fontStyle:"italic", margin:"2px 0 0", fontWeight:300 }}>Session {data.sessionsPlayed + 1}</p>
            </div>
            <Tag variant="critical"><span style={{ width:5, height:5, borderRadius:"50%", background:T.crimson, display:"inline-block", animation:"pulse 2s infinite" }}/> Live</Tag>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <button onClick={()=>setRefPanelOpen(!refPanelOpen)} style={{
              padding:"8px 14px", background:refPanelOpen?T.crimsonSoft:T.bgInput, border:`1px solid ${refPanelOpen?T.crimsonBorder:T.border}`,
              color:refPanelOpen?T.crimson:T.textMuted, fontFamily:T.ui, fontSize:9, letterSpacing:"1.5px",
              textTransform:"uppercase", fontWeight:500, borderRadius:"2px", cursor:"pointer"
            }}><Layers size={11} style={{display:"inline-block", marginRight:4}}/> Reference</button>
            <div style={{ display:"flex", gap:0 }}>
              {[{id:"battlemap",label:"Map"},{id:"npcs",label:"NPCs"}].map(t=>(
                <button key={t.id} onClick={()=>setMode(t.id)} style={{
                  padding:"8px 16px", background:mode===t.id?T.crimsonSoft:"transparent",
                  border:`1px solid ${mode===t.id?T.crimsonBorder:T.border}`, cursor:"pointer",
                  color:mode===t.id?T.crimson:T.textMuted, fontFamily:T.ui, fontSize:9, letterSpacing:"1.5px",
                  textTransform:"uppercase", fontWeight:500, borderRadius:t.id==="battlemap"?"2px 0 0 2px":"0 2px 2px 0",
                }}>{t.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab navigation for combat tools */}
        <div style={{ display:"flex", borderBottom:`1px solid ${T.border}`, background:T.bgMid, paddingLeft:24 }}>
          {[
            {id:"combat", icon:Swords, label:"Combat & Conditions"},
            {id:"loot", icon:Package, label:"Loot"},
            {id:"encounters", icon:Target, label:"Encounters"},
          ].map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{
              flex:1, padding:"12px 16px", background:"transparent", border:"none",
              borderBottom:activeTab===t.id?`3px solid ${T.crimson}`:"3px solid transparent",
              cursor:"pointer", color:activeTab===t.id?T.crimson:T.textMuted,
              fontFamily:T.ui, fontSize:8, letterSpacing:"2px", textTransform:"uppercase",
              fontWeight:500, transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"flex-start", gap:6,
            }}><t.icon size={11}/> {t.label}</button>
          ))}
        </div>

        {/* Main content area */}
        <div style={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column" }}>
          {mode === "battlemap" ? (
            <div style={{ flex:1, overflow:"auto", padding:24 }}>
              {activeTab === "combat" && (
                <div>
                  <SectionTitle icon={Heart}>Party Conditions & Status</SectionTitle>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:16, marginBottom:32 }}>
                    {data.party.map(p => (
                      <div key={p.id} style={{
                        padding:16, background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:"4px",
                      }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                          <span style={{ fontSize:13, fontWeight:500, color:T.text }}>{p.name}</span>
                          <span style={{ fontSize:10, color:T.textMuted, fontWeight:300 }}>{p.cls} Lv{p.lv}</span>
                        </div>
                        <div style={{ marginBottom:12 }}>
                          <div style={{ fontSize:10, color:T.textMuted, marginBottom:4 }}>HP</div>
                          <HpBar val={p.hp} max={p.maxHp} color={p.hp<p.maxHp*0.3?T.crimson:p.hp<p.maxHp*0.6?"#d97706":"#2d6a4f"}/>
                          <div style={{ fontSize:11, color:T.textDim, marginTop:4 }}>{p.hp}/{p.maxHp}</div>
                        </div>
                        <div style={{ marginBottom:12 }}>
                          <div style={{ fontSize:9, color:T.textMuted, letterSpacing:"1px", textTransform:"uppercase", marginBottom:6, fontWeight:500 }}>Conditions</div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:8 }}>
                            {conditions[p.id]?.slice(0,3).map((cond, idx) => (
                              <div key={idx} style={{
                                display:"inline-flex", alignItems:"center", gap:3,
                                background:"rgba(192,57,43,0.15)", color:T.crimson, padding:"2px 6px",
                                borderRadius:"2px", fontSize:8, fontWeight:500,
                              }}>
                                {cond.name}
                                <button onClick={()=>removeCondition(p.id, idx)} style={{
                                  background:"none", border:"none", cursor:"pointer", padding:0, color:T.crimson,
                                  display:"flex", alignItems:"center", fontSize:9, lineHeight:1
                                }}>x</button>
                              </div>
                            ))}
                          </div>
                          <div style={{ display:"flex", gap:4 }}>
                            <Select onChange={v=>{if(v) {addCondition(p.id, v); }}} value="" style={{ fontSize:8, padding:"4px 6px" }}>
                              <option value="">+ Condition</option>
                              {D5E_CONDITIONS.map(c=><option key={c} value={c}>{c}</option>)}
                            </Select>
                          </div>
                        </div>
                        <div style={{ display:"flex", gap:4, fontSize:8 }}>
                          <CrimsonBtn small onClick={()=>setData(d=>({...d, party: d.party.map(x=>x.id===p.id?{...x,hp:Math.min(x.hp+10,x.maxHp)}:x)}))} style={{flex:1, padding:"4px 8px", fontSize:"7px"}} >+10 HP</CrimsonBtn>
                          <CrimsonBtn small secondary onClick={()=>setData(d=>({...d, party: d.party.map(x=>x.id===p.id?{...x,hp:Math.max(0,x.hp-5)}:x)}))} style={{flex:1, padding:"4px 8px", fontSize:"7px"}}>−5 HP</CrimsonBtn>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop:32, paddingTop:24, borderTop:`1px solid ${T.border}` }}>
                    <SectionTitle icon={CheckCircle}>Rest Mechanics</SectionTitle>
                    <div style={{ display:"flex", gap:12 }}>
                      <CrimsonBtn onClick={()=>alert("Short Rest: Restore hit dice")} style={{flex:1, fontSize:"8px"}} secondary>
                        <Clock size={10}/> Short Rest
                      </CrimsonBtn>
                      <CrimsonBtn onClick={()=>{
                        setData(d=>({...d, party: d.party.map(p=>({...p, hp: p.maxHp}))}));
                        setConditions({});
                      }} style={{flex:1, fontSize:"8px"}}>
                        <CheckCircle size={10}/> Long Rest
                      </CrimsonBtn>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "loot" && (
                <div>
                  <SectionTitle icon={Package}>Loot Table Generator</SectionTitle>
                  <div style={{ marginBottom:24 }}>
                    <label style={{ fontSize:10, color:T.textMuted, fontFamily:T.ui, letterSpacing:"1px", textTransform:"uppercase", display:"block", marginBottom:8, fontWeight:500 }}>Encounter CR</label>
                    <div style={{ display:"flex", gap:8 }}>
                      <Input type="number" defaultValue="5" placeholder="CR" style={{flex:1, fontSize:12}} />
                      <CrimsonBtn onClick={()=>generateLoot(5)} style={{fontSize:"8px"}}>
                        <Plus size={10}/> Generate
                      </CrimsonBtn>
                    </div>
                  </div>

                  {lootHistory.length > 0 && (
                    <div>
                      <SectionTitle icon={Star}>Generated Loot</SectionTitle>
                      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
                        {lootHistory.slice(-5).reverse().map(loot => (
                          <div key={loot.id} style={{
                            padding:12, background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:"4px",
                            borderLeft:`3px solid ${getRarityColor(loot.rarity)}`
                          }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"start", marginBottom:4 }}>
                              <div>
                                <div style={{ fontSize:11, fontWeight:500, color:T.text }}>{loot.item}</div>
                                <div style={{ fontSize:9, color:T.textMuted }}>+ {loot.gold} gp</div>
                              </div>
                              <Tag variant="info">{loot.rarity}</Tag>
                            </div>
                            <div style={{ fontSize:8, color:T.textFaint, fontStyle:"italic" }}>Added {loot.addedAt}</div>
                          </div>
                        ))}
                      </div>
                      <CrimsonBtn secondary style={{width:"100%", fontSize:"8px"}}>Distribute to Party</CrimsonBtn>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "encounters" && (
                <div>
                  <SectionTitle icon={Target}>Encounter Builder</SectionTitle>
                  <div style={{ marginBottom:24 }}>
                    <label style={{ fontSize:10, color:T.textMuted, fontFamily:T.ui, letterSpacing:"1px", textTransform:"uppercase", display:"block", marginBottom:8, fontWeight:500 }}>Difficulty</label>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:16 }}>
                      {["Easy", "Medium", "Hard", "Deadly"].map(d=>(
                        <div key={d} style={{
                          padding:10, background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:"3px",
                          textAlign:"center"
                        }}>
                          <div style={{ fontSize:10, color:T.textMuted, fontWeight:500 }}>{d}</div>
                          <div style={{ fontSize:9, color:T.text, marginTop:4 }}>Check CR</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom:24, paddingTop:20, borderTop:`1px solid ${T.border}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                      <SectionTitle icon={Swords}>Combat Round</SectionTitle>
                      <Tag variant="default">Round {encounter.round}</Tag>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                      <CrimsonBtn onClick={()=>setEncounter(e=>({...e, round: Math.max(0, e.round-1)}))} secondary style={{flex:1, fontSize:"8px"}}>
                        <Minus size={10}/> Prev
                      </CrimsonBtn>
                      <CrimsonBtn onClick={()=>setEncounter(e=>({...e, round: e.round+1}))} style={{flex:1, fontSize:"8px"}}>
                        <Plus size={10}/> Next Round
                      </CrimsonBtn>
                    </div>
                  </div>

                  <div style={{ paddingTop:20, borderTop:`1px solid ${T.border}` }}>
                    <SectionTitle icon={AlertTriangle}>Death Saves</SectionTitle>
                    <p style={{ fontSize:10, color:T.textMuted, fontStyle:"italic", marginBottom:12, fontWeight:300 }}>
                      Track saves (3 successes/failures)
                    </p>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
                      {data.party.filter(p=>p.hp<=0).map(p=>(
                        <div key={p.id} style={{ padding:10, background:T.bgCard, border:`1px solid ${T.crimsonBorder}`, borderRadius:"3px" }}>
                          <div style={{ fontSize:11, fontWeight:500, color:T.text, marginBottom:6 }}>{p.name.split(" ")[0]}</div>
                          <div style={{ display:"flex", gap:6, fontSize:9 }}>
                            <span style={{flex:1}}>Succ: <strong style={{color:"#2d6a4f"}}>0</strong>/3</span>
                            <span style={{flex:1}}>Fail: <strong style={{color:T.crimson}}>0</strong>/3</span>
                          </div>
                        </div>
                      ))}
                      {data.party.filter(p=>p.hp<=0).length === 0 && (
                        <p style={{ fontSize:10, color:T.textMuted, fontStyle:"italic", gridColumn:"1/-1", padding:8, textAlign:"center" }}>
                          No unconscious members
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding:24, overflowY:"auto" }}>
              <SectionTitle icon={Users} count={data.npcs.filter(n=>n.alive).length}>NPC Reference</SectionTitle>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
                {data.npcs.filter(n=>n.alive).map(n => (
                  <div key={n.id} style={{
                    padding:"12px 14px", background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:"3px",
                    borderLeft:`3px solid ${n.attitude==="allied"||n.attitude==="friendly"?"#2d6a4f":n.attitude==="hostile"?T.crimson:T.textFaint}`,
                  }}>
                    <div style={{ fontSize:12, fontWeight:300, color:T.text, marginBottom:2 }}>{n.name}</div>
                    <div style={{ fontSize:10, color:T.textFaint, fontWeight:300, fontStyle:"italic" }}>{n.role} — {n.loc}</div>
                    {n.faction && <Tag variant="muted" style={{marginTop:4, fontSize:"7px"}}>{n.faction}</Tag>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <div style={{ display:"flex", flexDirection:"column", borderLeft:`1px solid ${T.border}`, background:T.bgMid, overflow:"hidden" }}>
        {/* Initiative/Dice tabs */}
        <div style={{ display:"flex", borderBottom:`1px solid ${T.border}`, marginBottom:0, flexShrink:0 }}>
          {[{id:"initiative",icon:Swords,label:"Initiative"},{id:"dice",icon:Dice6,label:"Dice"}].map(t=>(
            <button key={t.id} onClick={()=>setPanel(t.id)} style={{
              flex:1, padding:"12px 16px", background:"transparent", border:"none",
              borderBottom:panel===t.id?`3px solid ${T.crimson}`:"3px solid transparent",
              cursor:"pointer", color:panel===t.id?T.crimson:T.textMuted,
              fontFamily:T.ui, fontSize:8, letterSpacing:"1.5px", textTransform:"uppercase",
              fontWeight:500, transition:"all 0.3s", display:"flex", alignItems:"center", justifyContent:"center", gap:5,
            }}><t.icon size={11}/> {t.label}</button>
          ))}
        </div>

        <div style={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column" }}>
          <Section style={{ margin:0, borderRadius:0, border:"none", borderBottom:`1px solid ${T.border}`, flex:0.8 }}>
            {panel==="initiative" && <InitiativeTracker party={data.party}/>}
            {panel==="dice" && <DiceRoller/>}
          </Section>

          <Section style={{ borderRadius:0, border:"none", borderBottom:`1px solid ${T.border}`, flex:0.6 }}>
            <SectionTitle icon={Heart}>Party Status</SectionTitle>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {data.party.map(p => (
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0" }}>
                  <span style={{ fontSize:10, fontWeight:300, color:T.textDim, minWidth:55, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name.split(" ")[0]}</span>
                  <div style={{flex:1}}><HpBar val={p.hp} max={p.maxHp} color={p.hp<p.maxHp*0.3?T.crimson:p.hp<p.maxHp*0.6?"#d97706":"#2d6a4f"}/></div>
                  <span style={{ fontSize:9, color:T.textMuted, minWidth:35, textAlign:"right" }}>{p.hp}/{p.maxHp}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Quick Reference Panel (collapsible) */}
          {refPanelOpen && (
            <Section style={{ borderRadius:0, border:"none", overflow:"auto", flex:0.6 }}>
              <SectionTitle icon={Layers}>Quick Reference</SectionTitle>

              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:8, color:T.crimson, fontFamily:T.ui, letterSpacing:"0.5px", fontWeight:600, textTransform:"uppercase", marginBottom:6 }}>Action Economy</div>
                <div style={{ display:"flex", flexDirection:"column", gap:4, fontSize:8, color:T.textDim }}>
                  <div><strong style={{color:T.text}}>Action:</strong> Cast, Attack, Dash</div>
                  <div><strong style={{color:T.text}}>Bonus:</strong> Abilities, interact</div>
                  <div><strong style={{color:T.text}}>Reaction:</strong> Once/round</div>
                  <div><strong style={{color:T.text}}>Movement:</strong> Full speed</div>
                </div>
              </div>

              <div style={{ marginBottom:16, paddingTop:12, borderTop:`1px solid ${T.border}` }}>
                <div style={{ fontSize:8, color:T.crimson, fontFamily:T.ui, letterSpacing:"0.5px", fontWeight:600, textTransform:"uppercase", marginBottom:6 }}>DCs</div>
                <div style={{ display:"flex", flexDirection:"column", gap:3, fontSize:8, color:T.textDim }}>
                  <div><strong>10</strong> Easy</div>
                  <div><strong>15</strong> Medium</div>
                  <div><strong>20</strong> Hard</div>
                  <div><strong>25</strong> V. Hard</div>
                  <div><strong>30</strong> Impossible</div>
                </div>
              </div>

              <div style={{ marginBottom:16, paddingTop:12, borderTop:`1px solid ${T.border}` }}>
                <div style={{ fontSize:8, color:T.crimson, fontFamily:T.ui, letterSpacing:"0.5px", fontWeight:600, textTransform:"uppercase", marginBottom:6 }}>Cover</div>
                <div style={{ display:"flex", flexDirection:"column", gap:3, fontSize:8, color:T.textDim }}>
                  <div><strong>Half:</strong> +2 AC</div>
                  <div><strong>3/4:</strong> +5 AC</div>
                  <div><strong>Total:</strong> Cannot target</div>
                </div>
              </div>

              <div style={{ paddingTop:12, borderTop:`1px solid ${T.border}` }}>
                <div style={{ fontSize:8, color:T.crimson, fontFamily:T.ui, letterSpacing:"0.5px", fontWeight:600, textTransform:"uppercase", marginBottom:6 }}>Concentration</div>
                <div style={{ fontSize:8, color:T.textDim }}>DC 10 or half dmg taken. Save to maintain.</div>
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CAMPAIGN NOTES / ADVENTURE MODULE FORMATTER
// ═══════════════════════════════════════════════════════════════════════════

function NotesView({ data, setData }) {
  const [notes, setNotes] = useState(data.campaignNotes || []);
  const [activeNote, setActiveNote] = useState(null);
  const [reformatMode, setReformatMode] = useState(false);
  const [rawInput, setRawInput] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // "list" or "grid"
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState("modified"); // "modified", "title", "category"
  const [quickNoteOpen, setQuickNoteOpen] = useState(false);
  const [quickNoteTitle, setQuickNoteTitle] = useState("");
  const [quickNoteContent, setQuickNoteContent] = useState("");

  const categoryDefs = [
    { id: "session", label: "Session Notes", color: "#c0392b" },
    { id: "lore", label: "Lore", color: "#8e44ad" },
    { id: "npc", label: "NPC Notes", color: "#2980b9" },
    { id: "handout", label: "Player Handouts", color: "#27ae60" },
    { id: "dm", label: "DM Only", color: "#d35400" },
    { id: "world", label: "World Building", color: "#16a085" },
    { id: "rules", label: "Rules", color: "#c23030" },
    { id: "plot", label: "Plot Hooks", color: "#e74c3c" },
  ];

  const createNote = (title = "Untitled Chapter", content = "", category = "session") => {
    const now = new Date().toISOString();
    const note = {
      id: uid(),
      title,
      content,
      type: "chapter",
      category,
      pinned: false,
      dmOnly: false,
      linkedTo: { regions: [], npcs: [], quests: [] },
      createdAt: now,
      updatedAt: now,
    };
    const updated = [...notes, note];
    setNotes(updated);
    setData(d => ({...d, campaignNotes: updated}));
    setActiveNote(note.id);
    return note;
  };

  const updateNote = (id, updates) => {
    const updated = notes.map(n => n.id===id ? {...n, ...updates, updatedAt: new Date().toISOString()} : n);
    setNotes(updated);
    setData(d => ({...d, campaignNotes: updated}));
  };

  const deleteNote = (id) => {
    const updated = notes.filter(n=>n.id!==id);
    setNotes(updated);
    setData(d => ({...d, campaignNotes: updated}));
    if (activeNote === id) setActiveNote(null);
  };

  const togglePin = (id) => {
    const note = notes.find(n => n.id === id);
    updateNote(id, { pinned: !note.pinned });
  };

  const createQuickNote = () => {
    if (quickNoteTitle.trim()) {
      createNote(quickNoteTitle, quickNoteContent, "session");
      setQuickNoteTitle("");
      setQuickNoteContent("");
      setQuickNoteOpen(false);
    }
  };

  const filteredAndSorted = notes
    .filter(n => {
      const matchesCategory = filterCategory === "all" || n.category === filterCategory;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || n.title.toLowerCase().includes(searchLower) || n.content.toLowerCase().includes(searchLower);
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1; // Pinned first
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "category") return (a.category || "").localeCompare(b.category || "");
      return new Date(b.updatedAt) - new Date(a.updatedAt); // Modified date
    });

  const getCategoryColor = (categoryId) => {
    return categoryDefs.find(c => c.id === categoryId)?.color || "#95a5a6";
  };

  const getCategoryLabel = (categoryId) => {
    return categoryDefs.find(c => c.id === categoryId)?.label || "Unknown";
  };

  const categoryStats = categoryDefs.map(cat => ({
    ...cat,
    count: notes.filter(n => n.category === cat.id).length,
  }));

  const highlightSearchMatches = (text) => {
    if (!searchTerm) return text;
    const parts = text.split(new RegExp(`(${searchTerm})`, "gi"));
    return parts;
  };

  const formatAsModule = (content) => {
    const lines = content.split("\n");
    let formatted = "";
    let inStatBlock = false;

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        if (inStatBlock) { inStatBlock = false; formatted += "---\n\n"; }
        else formatted += "\n";
        return;
      }
      // Headers: # syntax or ALL CAPS lines
      if (trimmed.match(/^#{1,3}\s/) || (trimmed === trimmed.toUpperCase() && trimmed.length < 60 && trimmed.length > 2 && /[A-Z]/.test(trimmed))) {
        if (inStatBlock) { inStatBlock = false; formatted += "---\n\n"; }
        const level = trimmed.startsWith("###") ? "### " : trimmed.startsWith("##") ? "## " : trimmed.startsWith("#") ? "## " : "## ";
        const headerText = trimmed.replace(/^#+\s*/, "");
        formatted += `${level}${headerText}\n\n`;
      }
      // Read-aloud text (quotes or >)
      else if (trimmed.startsWith(">") || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        if (inStatBlock) { inStatBlock = false; formatted += "---\n\n"; }
        formatted += `> *${trimmed.replace(/^[>"]\s*/, "").replace(/^"/, "").replace(/"$/, "")}*\n\n`;
      }
      // Stat block lines (Key: Value pattern, short lines)
      else if (trimmed.match(/^[\w\s]+:\s/) && trimmed.length < 80) {
        if (!inStatBlock) { formatted += "---\n"; inStatBlock = true; }
        formatted += `**${trimmed.split(":")[0].trim()}:** ${trimmed.split(":").slice(1).join(":").trim()}\n`;
      }
      // Bullet points
      else if (trimmed.startsWith("-") || trimmed.startsWith("•") || trimmed.startsWith("*")) {
        if (inStatBlock) { inStatBlock = false; formatted += "---\n\n"; }
        formatted += `${trimmed}\n`;
      }
      // Regular text
      else {
        if (inStatBlock) { inStatBlock = false; formatted += "---\n\n"; }
        formatted += `${trimmed}\n\n`;
      }
    });

    if (inStatBlock) formatted += "---\n";
    return formatted.trim();
  };

  const wordCount = (content) => content.trim().split(/\s+/).length;
  const charCount = (content) => content.length;

  const handleReformat = () => {
    if (!rawInput.trim()) return;
    const formatted = formatAsModule(rawInput);
    const title = rawInput.split("\n")[0].substring(0, 60).replace(/^#+\s*/, "") || "Reformatted Notes";
    createNote(title, formatted);
    setRawInput("");
    setReformatMode(false);
  };

  const active = notes.find(n=>n.id===activeNote);

  const noteTypes = [
    { id:"chapter", label:"Chapter", icon:BookOpen },
    { id:"encounter", label:"Encounter", icon:Swords },
    { id:"location", label:"Location", icon:MapPin },
    { id:"lore", label:"Lore", icon:Scroll },
    { id:"handout", label:"Handout", icon:FileText },
  ];

  const renderPreview = (content) => {
    return content.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} style={{ height:8 }} />;
      if (trimmed === "---") return <hr key={i} style={{ border:"none", borderTop:`1px solid ${T.crimsonBorder}`, margin:"6px 0" }} />;
      if (trimmed.startsWith("## ")) return (
        <h2 key={i} style={{
          fontFamily:T.ui, fontSize:16, letterSpacing:"2px", color:T.crimson, textTransform:"uppercase",
          fontWeight:500, margin:"24px 0 12px", borderBottom:`1px solid ${T.crimsonBorder}`, paddingBottom:8,
        }}>{trimmed.slice(3)}</h2>
      );
      if (trimmed.startsWith("### ")) return (
        <h3 key={i} style={{
          fontFamily:T.ui, fontSize:13, letterSpacing:"1px", color:T.text, fontWeight:500, margin:"16px 0 8px",
        }}>{trimmed.slice(4)}</h3>
      );
      if (trimmed.startsWith("> ")) return (
        <blockquote key={i} style={{
          borderLeft:`3px solid ${T.crimson}`, background:"rgba(192,57,43,0.05)", padding:"10px 16px",
          margin:"12px 0", color:T.textDim, fontStyle:"italic", fontSize:14, lineHeight:1.8, fontWeight:300,
          borderRadius:"0 3px 3px 0",
        }}>{trimmed.slice(2).replace(/\*/g,"")}</blockquote>
      );
      if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) return (
        <div key={i} style={{ paddingLeft:16, fontSize:13, color:T.textDim, lineHeight:1.7, fontWeight:300 }}>{trimmed}</div>
      );
      if (trimmed.match(/^\*\*[\w\s]+:\*\*/)) {
        const parts = trimmed.match(/^\*\*(.*?):\*\*\s*(.*)/);
        if (parts) return (
          <div key={i} style={{ fontSize:13, lineHeight:1.7, fontWeight:300, color:T.textDim, padding:"1px 0" }}>
            <strong style={{ color:T.text, fontWeight:500, fontFamily:T.ui, fontSize:11, letterSpacing:"0.5px" }}>{parts[1]}:</strong> {parts[2]}
          </div>
        );
      }
      return <p key={i} style={{ fontSize:14, color:T.textDim, lineHeight:1.8, margin:"0 0 8px", fontWeight:300 }}>{trimmed}</p>;
    });
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"320px 1fr", gap:0, height:"calc(100vh - 56px)" }}>
      {/* Sidebar with Categories & Search */}
      <div style={{ borderRight:`1px solid ${T.border}`, padding:20, overflowY:"auto", background:T.bgMid }}>
        <SectionTitle icon={BookOpen}>Campaign Notes</SectionTitle>
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:16 }}>
          <CrimsonBtn onClick={()=>createNote()} small style={{ width:"100%" }}><Plus size={11}/> New Note</CrimsonBtn>
          <CrimsonBtn onClick={()=>setReformatMode(true)} secondary small style={{ width:"100%" }}><RefreshCw size={11}/> Reformat</CrimsonBtn>
          <CrimsonBtn onClick={()=>setQuickNoteOpen(true)} secondary small style={{ width:"100%" }}><Scroll size={11}/> Quick Note</CrimsonBtn>
        </div>

        {/* Search */}
        <div style={{ marginBottom:16 }}>
          <div style={{ position:"relative" }}>
            <Input
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search notes..."
              style={{ fontSize:12, paddingLeft:28 }}
            />
            <Search size={12} style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", color:T.textFaint, pointerEvents:"none" }} />
          </div>
          {searchTerm && <div style={{ fontSize:10, color:T.textMuted, marginTop:6, fontStyle:"italic" }}>{filteredAndSorted.length} result{filteredAndSorted.length !== 1 ? "s" : ""}</div>}
        </div>

        {/* Category Filter & Stats */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, color:T.textMuted, textTransform:"uppercase", letterSpacing:"1px", fontWeight:500, marginBottom:8 }}>Categories</div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <div
              onClick={()=>setFilterCategory("all")}
              style={{
                padding:"6px 10px", cursor:"pointer", borderRadius:"2px",
                background: filterCategory === "all" ? T.crimsonSoft : "transparent",
                border:`1px solid ${filterCategory === "all" ? T.crimsonBorder : "transparent"}`,
                fontSize:12, color: filterCategory === "all" ? T.crimson : T.textMuted,
                transition:"all 0.15s",
              }}
            >
              All Notes ({notes.length})
            </div>
            {categoryStats.map(cat => (
              <div
                key={cat.id}
                onClick={()=>setFilterCategory(cat.id)}
                style={{
                  padding:"6px 10px", cursor:"pointer", borderRadius:"2px", display:"flex", alignItems:"center", gap:6,
                  background: filterCategory === cat.id ? T.crimsonSoft : "transparent",
                  border:`1px solid ${filterCategory === cat.id ? T.crimsonBorder : "transparent"}`,
                  transition:"all 0.15s",
                }}
              >
                <div style={{ width:8, height:8, borderRadius:"50%", background:cat.color }} />
                <span style={{ flex:1, fontSize:11, color: filterCategory === cat.id ? T.crimson : T.textMuted, fontWeight:300 }}>{cat.label}</span>
                <span style={{ fontSize:10, color:T.textFaint, fontWeight:500 }}>{cat.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sorting */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, color:T.textMuted, textTransform:"uppercase", letterSpacing:"1px", fontWeight:500, marginBottom:6 }}>Sort By</div>
          <Select value={sortBy} onChange={setSortBy} style={{ fontSize:11, width:"100%" }}>
            <option value="modified">Last Modified</option>
            <option value="title">Title A–Z</option>
            <option value="category">Category</option>
          </Select>
        </div>

        {/* Notes List */}
        <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
          {filteredAndSorted.length === 0 ? (
            <p style={{ fontSize:11, color:T.textFaint, fontStyle:"italic", textAlign:"center", padding:12, fontWeight:300 }}>
              {searchTerm ? "No notes match your search." : "No notes in this category."}
            </p>
          ) : (
            filteredAndSorted.map(n => (
              <div
                key={n.id}
                onClick={()=>{setActiveNote(n.id);setPreviewMode(false);setReformatMode(false);}}
                style={{
                  padding:"10px 12px", cursor:"pointer", borderRadius:"2px", position:"relative",
                  background: activeNote===n.id ? T.bgHover : "transparent",
                  border:`1px solid ${activeNote===n.id ? T.crimsonBorder : "transparent"}`,
                  borderLeft: `3px solid ${getCategoryColor(n.category)}`,
                  transition:"all 0.15s",
                  display:"flex", flexDirection:"column", gap:4,
                }}
              >
                <div style={{ display:"flex", alignItems:"flex-start", gap:6 }}>
                  {n.pinned && <Star size={10} fill={T.crimson} color={T.crimson} style={{ marginTop:1, flexShrink:0 }} />}
                  <span style={{ flex:1, fontSize:11, color:T.text, fontWeight:300, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{n.title}</span>
                  <button onClick={e=>{e.stopPropagation();deleteNote(n.id);}} style={{ background:"none", border:"none", cursor:"pointer", color:T.textFaint, padding:0 }}><Trash2 size={9}/></button>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:10, color:T.textFaint }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:getCategoryColor(n.category) }} />
                  <span>{getCategoryLabel(n.category)}</span>
                  {n.dmOnly && <span style={{ color:"#e74c3c", fontWeight:500 }}>DM</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor / Preview */}
      <div style={{ padding:32, overflowY:"auto", position:"relative" }}>
        {reformatMode ? (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div>
                <div style={{ fontSize:28, color:T.text, fontWeight:300 }}>Reformat into Adventure Module</div>
                <p style={{ fontSize:12, color:T.textMuted, fontStyle:"italic", margin:"6px 0 0", fontWeight:300 }}>
                  Paste your raw DM notes, session prep, or homebrew writing and transform it into a polished, traditional D&D adventure module layout.
                </p>
              </div>
              <CrimsonBtn onClick={()=>setReformatMode(false)} secondary small><X size={11}/> Cancel</CrimsonBtn>
            </div>

            <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
              {[
                { label:"Headers", hint:"# or ALL CAPS lines become section headers" },
                { label:"Read-Aloud", hint:'> or "quoted" text becomes boxed read-aloud' },
                { label:"Stat Blocks", hint:"Key: Value lines group into stat blocks" },
                { label:"Lists", hint:"- or • lines become bullet lists" },
              ].map(tip => (
                <div key={tip.label} style={{ background:T.bgCard, border:`1px solid ${T.border}`, borderRadius:"3px", padding:"6px 10px", fontSize:10, color:T.textMuted }}>
                  <span style={{ color:T.crimson, fontFamily:T.ui, letterSpacing:"0.5px", fontSize:9 }}>{tip.label}</span>
                  <span style={{ margin:"0 4px", color:T.textFaint }}>—</span>
                  <span style={{ fontStyle:"italic", fontWeight:300 }}>{tip.hint}</span>
                </div>
              ))}
            </div>

            <Textarea value={rawInput} onChange={setRawInput}
              placeholder={"# Chapter 1: The Dark Beginning\n\nThe party arrives at the village of Thornhaven as dusk settles over the valley.\n\n> \"Welcome, travelers. Dark times have befallen our village.\"\n\nLOCATION: THE OLD TAVERN\nThe tavern is dimly lit with a roaring fireplace.\n\n- Three patrons sit at the bar\n- A hooded figure watches from the corner\n- The barkeep polishes glasses nervously\n\nEnemy: Bandit Captain\nHP: 65\nAC: 15\nAttack: +5 to hit, 1d8+3 slashing\nChallenge: 2 (450 XP)"}
              rows={14} />

            {rawInput && (
              <div style={{ marginTop:20 }}>
                <SectionTitle icon={Eye}>Module Preview</SectionTitle>
                <div style={{
                  padding:"32px 40px", background:`linear-gradient(135deg, ${T.bgCard} 0%, ${T.bgMid} 100%)`,
                  border:`1px solid ${T.crimsonBorder}`, borderRadius:"4px", maxHeight:360, overflowY:"auto",
                  boxShadow:"inset 0 0 60px rgba(0,0,0,0.15)",
                }}>
                  <div style={{ maxWidth:640 }}>
                    {renderPreview(formatAsModule(rawInput))}
                  </div>
                </div>
              </div>
            )}
            <div style={{ marginTop:16, display:"flex", gap:12, alignItems:"center" }}>
              <CrimsonBtn onClick={handleReformat} disabled={!rawInput.trim()}><Save size={12}/> Reformat & Save</CrimsonBtn>
              <span style={{ fontSize:11, color:T.textFaint, fontStyle:"italic" }}>Saves as a new note with adventure module formatting</span>
            </div>
          </div>
        ) : active ? (
          <div>
            {/* Title, Category, Controls */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24, gap:20 }}>
              <div style={{ flex:1 }}>
                <Input
                  value={active.title}
                  onChange={v=>updateNote(active.id,{title:v})}
                  style={{ fontSize:24, fontWeight:300, border:"none", background:"transparent", padding:0, color:T.text, width:"100%", marginBottom:12 }}
                />
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <Select value={active.category || "session"} onChange={v=>updateNote(active.id,{category:v})} style={{ fontSize:11, padding:"4px 8px" }}>
                    {categoryDefs.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
                  </Select>
                  <button
                    onClick={()=>togglePin(active.id)}
                    style={{
                      background:"none", border:"none", cursor:"pointer", padding:0,
                      color: active.pinned ? T.crimson : T.textFaint,
                      transition:"color 0.2s", display:"flex", alignItems:"center", gap:6
                    }}
                  >
                    <Star size={14} fill={active.pinned ? T.crimson : "none"} />
                    <span style={{ fontSize:10, fontFamily:T.ui }}>{active.pinned ? "Pinned" : "Pin"}</span>
                  </button>
                  <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer" }}>
                    <input
                      type="checkbox"
                      checked={active.dmOnly || false}
                      onChange={e=>updateNote(active.id,{dmOnly:e.target.checked})}
                      style={{ cursor:"pointer" }}
                    />
                    <span style={{ fontSize:10, fontFamily:T.ui, color:active.dmOnly ? "#e74c3c" : T.textMuted }}>DM Only</span>
                  </label>
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <CrimsonBtn onClick={()=>setPreviewMode(!previewMode)} secondary small>
                  {previewMode ? <><Edit3 size={11}/> Edit</> : <><Eye size={11}/> Preview</>}
                </CrimsonBtn>
              </div>
            </div>

            {/* Stats & Timestamps */}
            <div style={{ display:"flex", gap:16, marginBottom:20, fontSize:10, color:T.textFaint }}>
              <div>
                <strong>{wordCount(active.content)}</strong> words, <strong>{charCount(active.content)}</strong> chars
              </div>
              <div>
                Created {new Date(active.createdAt).toLocaleDateString()}
              </div>
              <div>
                Modified {new Date(active.updatedAt).toLocaleDateString()} at {new Date(active.updatedAt).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}
              </div>
            </div>

            {previewMode ? (
              <div style={{
                padding:"40px 48px", background:`linear-gradient(135deg, ${T.bgCard} 0%, ${T.bgMid} 100%)`,
                border:`1px solid ${T.crimsonBorder}`, borderRadius:"4px", minHeight:400,
                boxShadow:"inset 0 0 60px rgba(0,0,0,0.15)",
              }}>
                <div style={{ maxWidth:640 }}>
                  <div style={{ textAlign:"center", marginBottom:32 }}>
                    <div style={{ width:40, height:1, background:T.crimson, margin:"0 auto 16px" }} />
                    <h1 style={{ fontFamily:T.ui, fontSize:22, letterSpacing:"4px", color:T.crimson, textTransform:"uppercase", fontWeight:500, marginBottom:4 }}>{active.title}</h1>
                    <div style={{ fontSize:10, color:T.textFaint, fontStyle:"italic", fontFamily:T.ui, letterSpacing:"1.5px", textTransform:"uppercase" }}>{getCategoryLabel(active.category || "session")}</div>
                    {active.dmOnly && <div style={{ fontSize:9, color:"#e74c3c", fontWeight:500, marginTop:6 }}>DM EYES ONLY</div>}
                    <div style={{ width:40, height:1, background:T.crimson, margin:"16px auto 0" }} />
                  </div>
                  {renderPreview(active.content)}
                </div>
              </div>
            ) : (
              <Textarea
                value={active.content}
                onChange={v=>updateNote(active.id,{content:v})}
                placeholder="Write your campaign notes here using markdown-style formatting:\n\n## Section Header\n> Read-aloud text for players\n**Stat Name:** Value\n- Bullet point\n\nRegular paragraph text..."
                rows={24}
                style={{ minHeight:500, fontSize:14, lineHeight:1.8, fontFamily:T.body }}
              />
            )}
          </div>
        ) : (
          <div style={{ textAlign:"center", paddingTop:100 }}>
            <BookOpen size={40} color={T.textFaint} style={{marginBottom:16}} />
            <div style={{ fontSize:20, color:T.textDim, fontWeight:300, marginBottom:8 }}>Campaign Notes & Module Formatter</div>
            <p style={{ fontSize:13, color:T.textFaint, fontStyle:"italic", fontWeight:300, maxWidth:440, margin:"0 auto 24px" }}>
              Write your campaign notes from scratch or paste your raw DM notes and reformat them into a traditional adventure module style — complete with proper headers, read-aloud boxes, and stat blocks.
            </p>
            <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
              <CrimsonBtn onClick={()=>createNote()} small><Plus size={11}/> New Note</CrimsonBtn>
              <CrimsonBtn onClick={()=>setReformatMode(true)} secondary small><RefreshCw size={11}/> Reformat Notes</CrimsonBtn>
            </div>
          </div>
        )}

        {/* Quick Note Modal */}
        <Modal open={quickNoteOpen} onClose={()=>setQuickNoteOpen(false)} title="Quick Note">
          <div style={{ padding:28 }}>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:10, color:T.textMuted, textTransform:"uppercase", letterSpacing:"1px", fontWeight:500, marginBottom:8 }}>Title</label>
              <Input
                value={quickNoteTitle}
                onChange={setQuickNoteTitle}
                placeholder="Note title..."
              />
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ display:"block", fontSize:10, color:T.textMuted, textTransform:"uppercase", letterSpacing:"1px", fontWeight:500, marginBottom:8 }}>Content</label>
              <Textarea
                value={quickNoteContent}
                onChange={setQuickNoteContent}
                placeholder="Write your note..."
                rows={6}
              />
            </div>
            <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
              <CrimsonBtn onClick={()=>setQuickNoteOpen(false)} secondary small><X size={11}/> Cancel</CrimsonBtn>
              <CrimsonBtn onClick={createQuickNote} small disabled={!quickNoteTitle.trim()}><Save size={11}/> Save Note</CrimsonBtn>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

function SettingsView({ data, setData }) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteSessionsConfirm, setShowDeleteSessionsConfirm] = useState(false);
  const [showDeleteNotesConfirm, setShowDeleteNotesConfirm] = useState(false);
  const [confirmStep, setConfirmStep] = useState(0); // 0: initial, 1: double-confirm
  const [mapZoom, setMapZoom] = useState(data.mapZoom || 1);
  const [dashboardLayout, setDashboardLayout] = useState(data.dashboardLayout || "compact");
  const [timelineSort, setTimelineSort] = useState(data.timelineSort || "chronological");

  const modules = data.modules;
  const toggleModule = (key) => {
    setData(d => ({...d, modules: {...d.modules, [key]: !d.modules[key]}}));
  };

  const moduleList = [
    { key:"timeline", label:"Campaign Timeline", desc:"Track sessions, events, and world changes over time", icon:Clock },
    { key:"worldState", label:"World State", desc:"Manage regions, factions, and NPCs with interconnected data", icon:Globe },
    { key:"playMode", label:"Play Mode", desc:"Live DM tools: initiative tracker, dice roller, party status", icon:Swords },
    { key:"scheduler", label:"Session Scheduler", desc:"Schedule recurring or one-off sessions with countdown timer", icon:Calendar },
    { key:"questTracker", label:"Quest Tracker", desc:"Track active, completed, and upcoming quests", icon:Scroll },
    { key:"factionTracker", label:"Faction Tracker", desc:"Monitor faction power, attitudes, and trends", icon:Shield },
    { key:"npcTracker", label:"NPC Tracker", desc:"Manage NPCs, their locations, and relationships", icon:Users },
    { key:"playerUploads", label:"Player Uploads", desc:"Allow players to upload character sheets to their profiles", icon:Upload },
    { key:"notesEditor", label:"Notes & Module Formatter", desc:"Write campaign notes and reformat them into traditional adventure module style", icon:BookOpen },
  ];

  // Calculate campaign statistics
  const daysSinceStart = data.startDate ? Math.floor((Date.now() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const stats = {
    regions: data.regions?.length || 0,
    npcs: data.npcs?.length || 0,
    quests: data.quests?.length || 0,
    factions: data.factions?.length || 0,
    sessions: data.timeline?.length || 0,
    notes: data.campaignNotes?.length || 0,
    completedQuests: data.quests?.filter(q => q.status === "completed").length || 0,
  };

  const handleResetCampaign = () => {
    if (confirmStep === 0) {
      setConfirmStep(1);
    } else {
      const newData = {
        ...data,
        party: [],
        quests: [],
        factions: [],
        regions: [],
        npcs: [],
        timeline: [],
        campaignNotes: [],
      };
      setData(newData);
      setShowResetConfirm(false);
      setConfirmStep(0);
    }
  };

  const handleDeleteSessions = () => {
    if (confirmStep === 0) {
      setConfirmStep(1);
    } else {
      setData(d => ({...d, timeline: []}));
      setShowDeleteSessionsConfirm(false);
      setConfirmStep(0);
    }
  };

  const handleDeleteNotes = () => {
    if (confirmStep === 0) {
      setConfirmStep(1);
    } else {
      setData(d => ({...d, campaignNotes: []}));
      setShowDeleteNotesConfirm(false);
      setConfirmStep(0);
    }
  };

  const handleExportCampaign = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.name.replace(/\s+/g, "_")}_campaign_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportCampaign = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const imported = JSON.parse(ev.target.result);
            setData(imported);
          } catch (err) {
            alert("Failed to parse campaign file. Ensure it's a valid JSON export.");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const applyDisplayPreferences = () => {
    setData(d => ({...d, mapZoom, dashboardLayout, timelineSort}));
  };

  return (
    <div style={{ padding:"32px 56px", maxWidth:900, margin:"0 auto" }}>
      <div style={{ marginBottom:32, paddingBottom:20, borderBottom:`1px solid ${T.crimsonBorder}` }}>
        <div style={{ fontSize:42, color:T.text, fontWeight:300, marginBottom:8 }}>Campaign Settings</div>
        <p style={{ fontSize:13, color:T.textMuted, fontStyle:"italic", margin:0, fontWeight:300 }}>Manage features, data, and campaign preferences</p>
      </div>

      {/* Campaign Info Section */}
      <Section style={{ marginBottom:24 }}>
        <SectionTitle icon={Crown}>Campaign Info</SectionTitle>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          <div>
            <span style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Campaign Name</span>
            <Input value={data.name} onChange={v=>setData(d=>({...d,name:v}))} />
          </div>
          <div>
            <span style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Status</span>
            <Select value={data.status} onChange={v=>setData(d=>({...d,status:v}))} style={{ width:"100%" }}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </Select>
          </div>
          <div>
            <span style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Start Date</span>
            <Input type="date" value={data.startDate} onChange={v=>setData(d=>({...d,startDate:v}))} />
          </div>
          <div>
            <span style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:6 }}>Campaign Duration</span>
            <div style={{ padding:"8px 12px", background:T.bgInput, border:`1px solid ${T.border}`, borderRadius:"2px", color:T.text, fontSize:13 }}>
              {daysSinceStart} day{daysSinceStart !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </Section>

      {/* Campaign Statistics */}
      <Section style={{ marginBottom:24 }}>
        <SectionTitle icon={Activity}>Campaign Statistics</SectionTitle>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:16 }}>
          <div style={{ padding:16, background:T.bgInput, borderRadius:"3px", textAlign:"center" }}>
            <div style={{ fontSize:24, fontWeight:500, color:T.crimson, marginBottom:4 }}>{stats.regions}</div>
            <div style={{ fontSize:10, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.5px" }}>Regions</div>
          </div>
          <div style={{ padding:16, background:T.bgInput, borderRadius:"3px", textAlign:"center" }}>
            <div style={{ fontSize:24, fontWeight:500, color:T.crimson, marginBottom:4 }}>{stats.npcs}</div>
            <div style={{ fontSize:10, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.5px" }}>NPCs</div>
          </div>
          <div style={{ padding:16, background:T.bgInput, borderRadius:"3px", textAlign:"center" }}>
            <div style={{ fontSize:24, fontWeight:500, color:T.crimson, marginBottom:4 }}>{stats.quests}</div>
            <div style={{ fontSize:10, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.5px" }}>Quests</div>
          </div>
          <div style={{ padding:16, background:T.bgInput, borderRadius:"3px", textAlign:"center" }}>
            <div style={{ fontSize:24, fontWeight:500, color:T.crimson, marginBottom:4 }}>{stats.factions}</div>
            <div style={{ fontSize:10, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.5px" }}>Factions</div>
          </div>
          <div style={{ padding:16, background:T.bgInput, borderRadius:"3px", textAlign:"center" }}>
            <div style={{ fontSize:24, fontWeight:500, color:T.crimson, marginBottom:4 }}>{stats.sessions}</div>
            <div style={{ fontSize:10, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.5px" }}>Sessions</div>
          </div>
          <div style={{ padding:16, background:T.bgInput, borderRadius:"3px", textAlign:"center" }}>
            <div style={{ fontSize:24, fontWeight:500, color:T.crimson, marginBottom:4 }}>{stats.notes}</div>
            <div style={{ fontSize:10, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.5px" }}>Notes</div>
          </div>
        </div>
        <div style={{ marginTop:16, padding:12, background:"rgba(0,0,0,0.1)", borderRadius:"3px", fontSize:11, color:T.textMuted }}>
          Quest completion: {stats.completedQuests}/{stats.quests} ({stats.quests > 0 ? Math.round(stats.completedQuests / stats.quests * 100) : 0}%)
        </div>
      </Section>

      {/* Feature Modules */}
      <Section style={{ marginBottom:24 }}>
        <SectionTitle icon={Settings}>Feature Modules</SectionTitle>
        <p style={{ fontSize:12, color:T.textMuted, fontStyle:"italic", marginBottom:20, fontWeight:300 }}>Enable or disable modules to customize your workspace.</p>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {moduleList.map(m => (
            <div key={m.key} onClick={()=>toggleModule(m.key)} style={{
              display:"flex", alignItems:"center", gap:16, padding:"16px", cursor:"pointer",
              background: modules[m.key] ? T.crimsonSoft : "transparent",
              border:`1px solid ${modules[m.key] ? T.crimsonBorder : T.border}`,
              borderRadius:"4px", transition:"all 0.2s",
            }}>
              {modules[m.key] ? <ToggleRight size={22} color={T.crimson}/> : <ToggleLeft size={22} color={T.textFaint}/>}
              <m.icon size={16} color={modules[m.key] ? T.crimson : T.textFaint} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, color:modules[m.key]?T.text:T.textMuted, fontWeight:300 }}>{m.label}</div>
                <div style={{ fontSize:11, color:T.textFaint, fontWeight:300, fontStyle:"italic", marginTop:3 }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <CrimsonBtn onClick={()=>setData(d=>({...d, modules: moduleList.reduce((acc,m)=>{acc[m.key]=true;return acc;}, {})}))} secondary small style={{ marginTop:16 }}><RefreshCw size={11}/> Reset to Defaults</CrimsonBtn>
      </Section>

      {/* Display Preferences */}
      <Section style={{ marginBottom:24 }}>
        <SectionTitle icon={Eye}>Display Preferences</SectionTitle>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          <div>
            <label style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:8, fontWeight:500 }}>Map Default Zoom</label>
            <Select value={mapZoom} onChange={setMapZoom} style={{ width:"100%" }}>
              <option value={0.75}>75%</option>
              <option value={1}>100% (Default)</option>
              <option value={1.25}>125%</option>
              <option value={1.5}>150%</option>
            </Select>
          </div>
          <div>
            <label style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:8, fontWeight:500 }}>Dashboard Layout</label>
            <Select value={dashboardLayout} onChange={setDashboardLayout} style={{ width:"100%" }}>
              <option value="compact">Compact</option>
              <option value="spacious">Spacious</option>
              <option value="detailed">Detailed</option>
            </Select>
          </div>
          <div>
            <label style={{ fontFamily:T.ui, fontSize:8, letterSpacing:"1px", color:T.textMuted, textTransform:"uppercase", display:"block", marginBottom:8, fontWeight:500 }}>Timeline Sort Order</label>
            <Select value={timelineSort} onChange={setTimelineSort} style={{ width:"100%" }}>
              <option value="chronological">Chronological (Oldest First)</option>
              <option value="reverse">Reverse Chronological</option>
            </Select>
          </div>
        </div>
        <CrimsonBtn onClick={applyDisplayPreferences} small style={{ marginTop:16 }}><Save size={11}/> Apply Preferences</CrimsonBtn>
      </Section>

      {/* Data Export/Import */}
      <Section style={{ marginBottom:24 }}>
        <SectionTitle icon={Download}>Data Management</SectionTitle>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:500, color:T.text, marginBottom:8 }}>Backup & Restore</div>
            <div style={{ display:"flex", gap:12 }}>
              <CrimsonBtn onClick={handleExportCampaign} small><Download size={11}/> Export as JSON</CrimsonBtn>
              <CrimsonBtn onClick={handleImportCampaign} secondary small><Upload size={11}/> Import from JSON</CrimsonBtn>
            </div>
            <p style={{ fontSize:10, color:T.textFaint, marginTop:8, fontStyle:"italic" }}>Export a complete backup of your campaign or import a previously exported campaign.</p>
          </div>
          <div style={{ padding:12, background:T.bgInput, borderRadius:"3px", border:`1px solid ${T.border}` }}>
            <div style={{ fontSize:10, color:T.textMuted, fontWeight:500, marginBottom:4 }}>Last saved to browser: {new Date().toLocaleDateString()}</div>
            <div style={{ fontSize:9, color:T.textFaint, fontStyle:"italic" }}>Campaign data is auto-saved to your browser. Export regularly for cloud backup.</div>
          </div>
        </div>
      </Section>

      {/* Danger Zone */}
      <Section style={{
        marginBottom:24, background:"rgba(192,57,43,0.08)", border:`1px solid rgba(192,57,43,0.3)`,
      }}>
        <SectionTitle icon={AlertTriangle}>Danger Zone</SectionTitle>
        <p style={{ fontSize:11, color:T.textMuted, marginBottom:16, fontWeight:300 }}>Irreversible actions. Proceed with caution.</p>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {/* Clear Notes */}
          <div style={{ padding:12, background:T.bgCard, borderRadius:"3px", border:`1px solid ${T.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:12, fontWeight:500, color:T.text }}>Clear All Notes</div>
                <div style={{ fontSize:10, color:T.textFaint, marginTop:3 }}>Permanently delete all {stats.notes} campaign notes</div>
              </div>
              <CrimsonBtn onClick={()=>{setShowDeleteNotesConfirm(true);setConfirmStep(0);}} secondary small style={{ background:"rgba(192,57,43,0.15)", color:"#e8605a", borderColor:"rgba(192,57,43,0.45)" }}>Delete Notes</CrimsonBtn>
            </div>
          </div>

          {/* Clear Sessions */}
          <div style={{ padding:12, background:T.bgCard, borderRadius:"3px", border:`1px solid ${T.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:12, fontWeight:500, color:T.text }}>Clear All Sessions</div>
                <div style={{ fontSize:10, color:T.textFaint, marginTop:3 }}>Permanently delete all {stats.sessions} session records</div>
              </div>
              <CrimsonBtn onClick={()=>{setShowDeleteSessionsConfirm(true);setConfirmStep(0);}} secondary small style={{ background:"rgba(192,57,43,0.15)", color:"#e8605a", borderColor:"rgba(192,57,43,0.45)" }}>Delete Sessions</CrimsonBtn>
            </div>
          </div>

          {/* Reset Campaign */}
          <div style={{ padding:12, background:T.bgCard, borderRadius:"3px", border:`1px solid ${T.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:12, fontWeight:500, color:"#ff4444" }}>Reset Campaign</div>
                <div style={{ fontSize:10, color:T.textFaint, marginTop:3 }}>Erase all data and return to blank campaign</div>
              </div>
              <CrimsonBtn onClick={()=>{setShowResetConfirm(true);setConfirmStep(0);}} secondary small style={{ background:"rgba(192,57,43,0.15)", color:"#e8605a", borderColor:"rgba(192,57,43,0.45)" }}>Reset All</CrimsonBtn>
            </div>
          </div>
        </div>
      </Section>

      {/* Confirmation Modals */}
      <Modal open={showDeleteNotesConfirm} onClose={()=>{setShowDeleteNotesConfirm(false);setConfirmStep(0);}} title="Delete All Notes">
        <div style={{ padding:28 }}>
          {confirmStep === 0 ? (
            <div>
              <p style={{ fontSize:13, color:T.text, marginBottom:16 }}>This will permanently delete all <strong>{stats.notes}</strong> campaign notes. This action cannot be undone.</p>
              <p style={{ fontSize:11, color:T.textFaint, marginBottom:20, fontStyle:"italic" }}>Are you sure you want to proceed?</p>
              <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
                <CrimsonBtn onClick={()=>{setShowDeleteNotesConfirm(false);setConfirmStep(0);}} secondary small><X size={11}/> Cancel</CrimsonBtn>
                <CrimsonBtn onClick={handleDeleteNotes} small style={{ background:"#e8605a" }}>Delete All Notes</CrimsonBtn>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize:13, color:"#e8605a", fontWeight:500, marginBottom:16 }}>Are you absolutely sure? This cannot be undone.</p>
              <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
                <CrimsonBtn onClick={()=>{setShowDeleteNotesConfirm(false);setConfirmStep(0);}} secondary small><X size={11}/> Cancel</CrimsonBtn>
                <CrimsonBtn onClick={handleDeleteNotes} small style={{ background:"#e8605a" }}>Yes, Delete All Notes</CrimsonBtn>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal open={showDeleteSessionsConfirm} onClose={()=>{setShowDeleteSessionsConfirm(false);setConfirmStep(0);}} title="Delete All Sessions">
        <div style={{ padding:28 }}>
          {confirmStep === 0 ? (
            <div>
              <p style={{ fontSize:13, color:T.text, marginBottom:16 }}>This will permanently delete all <strong>{stats.sessions}</strong> session records. This action cannot be undone.</p>
              <p style={{ fontSize:11, color:T.textFaint, marginBottom:20, fontStyle:"italic" }}>Are you sure you want to proceed?</p>
              <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
                <CrimsonBtn onClick={()=>{setShowDeleteSessionsConfirm(false);setConfirmStep(0);}} secondary small><X size={11}/> Cancel</CrimsonBtn>
                <CrimsonBtn onClick={handleDeleteSessions} small style={{ background:"#e8605a" }}>Delete All Sessions</CrimsonBtn>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize:13, color:"#e8605a", fontWeight:500, marginBottom:16 }}>Are you absolutely sure? This cannot be undone.</p>
              <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
                <CrimsonBtn onClick={()=>{setShowDeleteSessionsConfirm(false);setConfirmStep(0);}} secondary small><X size={11}/> Cancel</CrimsonBtn>
                <CrimsonBtn onClick={handleDeleteSessions} small style={{ background:"#e8605a" }}>Yes, Delete All Sessions</CrimsonBtn>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal open={showResetConfirm} onClose={()=>{setShowResetConfirm(false);setConfirmStep(0);}} title="Reset Campaign">
        <div style={{ padding:28 }}>
          {confirmStep === 0 ? (
            <div>
              <p style={{ fontSize:13, color:T.text, marginBottom:16 }}>This will erase all campaign data (regions, NPCs, quests, factions, sessions, and notes). The campaign will be reset to a blank state.</p>
              <p style={{ fontSize:11, color:T.textFaint, marginBottom:20, fontStyle:"italic" }}>This action cannot be undone. Do you want to proceed?</p>
              <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
                <CrimsonBtn onClick={()=>{setShowResetConfirm(false);setConfirmStep(0);}} secondary small><X size={11}/> Cancel</CrimsonBtn>
                <CrimsonBtn onClick={handleResetCampaign} small style={{ background:"#e8605a" }}>Reset Campaign</CrimsonBtn>
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize:13, color:"#ff4444", fontWeight:500, marginBottom:16 }}>This is your FINAL WARNING. All campaign data will be permanently erased.</p>
              <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
                <CrimsonBtn onClick={()=>{setShowResetConfirm(false);setConfirmStep(0);}} secondary small><X size={11}/> Cancel</CrimsonBtn>
                <CrimsonBtn onClick={handleResetCampaign} small style={{ background:"#ff4444" }}>Permanently Reset Campaign</CrimsonBtn>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

export default function CampaignManager() {
  const [campaigns, setCampaigns] = useState([
    { id: "example", data: JSON.parse(JSON.stringify(EXAMPLE_CAMPAIGN)), isExample: true },
  ]);
  const [activeCampaignId, setActiveCampaignId] = useState("example");
  const [tab, setTab] = useState("dashboard");

  const data = campaigns.find(c=>c.id===activeCampaignId)?.data || NEW_CAMPAIGN();
  const setData = (updater) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id !== activeCampaignId) return c;
      const newData = typeof updater === "function" ? updater(c.data) : updater;
      return { ...c, data: newData };
    }));
  };

  const createCampaign = () => {
    const newId = `campaign-${Date.now()}`;
    setCampaigns(prev => [...prev, { id: newId, data: NEW_CAMPAIGN(), isExample: false }]);
    setActiveCampaignId(newId);
    setTab("dashboard");
  };
  const deleteCampaign = (id) => {
    setCampaigns(prev => prev.filter(c => c.id !== id));
    if (activeCampaignId === id) {
      const remaining = campaigns.filter(c => c.id !== id);
      setActiveCampaignId(remaining[0]?.id || "");
    }
  };

  const allTabs = [
    { id:"dashboard", label:"Campaign Hub", icon:Compass, always:true },
    { id:"timeline",  label:"Timeline",     icon:Clock,   module:"timeline" },
    { id:"world",     label:"World",        icon:Globe,   module:"worldState" },
    { id:"play",      label:"Play Mode",    icon:Swords,  module:"playMode" },
    { id:"notes",     label:"Notes",        icon:BookOpen, module:"notesEditor" },
    { id:"settings",  label:"Settings",     icon:Settings, always:true },
  ];

  const tabs = allTabs.filter(t => t.always || data.modules[t.module]);

  return (
    <div style={{ width:"100%", height:"100vh", display:"flex", flexDirection:"column", background:T.bg, color:T.text, fontFamily:T.body, overflow:"hidden" }}>
      <nav style={{ display:"flex", alignItems:"center", gap:0, padding:"0 56px", height:56, flexShrink:0, borderBottom:`1px solid ${T.border}`, background:T.bgNav, position:"sticky", top:0, zIndex:200 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginRight:36 }}>
          <Crown size={16} color={T.crimson} />
          <span style={{ fontFamily:T.ui, fontSize:10, fontWeight:500, color:T.text, letterSpacing:"3px", textTransform:"uppercase" }}>Campaign Manager</span>
        </div>
        <div style={{ flex:1, display:"flex", gap:24, overflowX:"auto" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              background:"transparent", border:"none", cursor:"pointer", padding:"18px 0",
              fontFamily:T.ui, fontSize:10, letterSpacing:"3px", textTransform:"uppercase",
              color:tab===t.id?T.text:T.textMuted, fontWeight:500, position:"relative",
              display:"flex", alignItems:"center", gap:6, transition:"color 0.2s", whiteSpace:"nowrap",
              borderBottom:tab===t.id?`2px solid ${T.crimson}`:"2px solid transparent",
            }}><t.icon size={13}/> {t.label}</button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <CampaignSelector
            campaigns={campaigns}
            activeCampaignId={activeCampaignId}
            onSelect={setActiveCampaignId}
            onCreate={createCampaign}
            onDelete={deleteCampaign}
          />
          <Bell size={14} color={T.textFaint} style={{cursor:"pointer"}} />
        </div>
      </nav>

      <div style={{ flex:1, overflow:"hidden" }}>
        <div style={{ height:"100%", overflowY:"auto" }}>
          {tab==="dashboard" && <DashboardView data={data} setData={setData} onNav={setTab}/>}
          {tab==="timeline"  && <TimelineView data={data} setData={setData}/>}
          {tab==="world"     && <WorldView data={data} setData={setData}/>}
          {tab==="play"      && <PlayView data={data} setData={setData}/>}
          {tab==="notes"     && <NotesView data={data} setData={setData}/>}
          {tab==="settings"  && <SettingsView data={data} setData={setData}/>}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;700&family=Spectral:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        *{box-sizing:border-box;}
        ::selection{background:${T.crimson};color:${T.text};}
        ::-webkit-scrollbar{width:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:${T.textFaint};border-radius:2px;}
        ::-webkit-scrollbar-thumb:hover{background:${T.textMuted};}
        input::placeholder{color:${T.textFaint};}
        textarea::placeholder{color:${T.textFaint};}
        input:focus, textarea:focus{outline:none;border-color:${T.crimson}!important;box-shadow:0 0 0 3px ${T.crimsonSoft};}
        select:focus{outline:none;border-color:${T.crimson}!important;}
        button:hover{filter:brightness(1.1);}
        input[type="range"]{-webkit-appearance:none;height:4px;background:${T.bgInput};border-radius:2px;outline:none;}
        input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;background:${T.crimson};border-radius:50%;cursor:pointer;}
      `}</style>
    </div>
  );
}
