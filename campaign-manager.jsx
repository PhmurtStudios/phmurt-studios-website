import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ChevronDown, ChevronRight, ChevronUp, Swords, Shield, Users, MapPin, Crown,
  Scroll, Clock, Calendar, Flame, Star, Eye, BookOpen, Dice1, Dice3, Dice5, Dice6,
  Target, Heart, Zap, AlertTriangle, CheckCircle, Circle, ArrowRight, Plus,
  Compass, Mountain, Castle, Skull, Flag, TrendingUp, TrendingDown, Minus,
  Play, Pause, SkipForward, Volume2, Search, Bell, Settings, Menu, X,
  ChevronLeft, MoreHorizontal, Crosshair, Map, Globe, Layers, Activity
} from "lucide-react";

// ─── MOCK DATA ──────────────────────────────────────────────────────────────

const CAMPAIGN_DATA = {
  name: "The Shattered Crown",
  status: "active",
  startDate: "2025-09-14",
  nextSession: "2026-04-02T19:00:00",
  sessionsPlayed: 24,
  party: [
    { id: 1, name: "Kael Stormwind", class: "Paladin", level: 9, hp: 78, maxHp: 85, ac: 20, player: "Marcus", status: "healthy", icon: "shield" },
    { id: 2, name: "Lyra Nightbloom", class: "Wizard", level: 9, hp: 42, maxHp: 48, ac: 15, player: "Sarah", status: "healthy", icon: "star" },
    { id: 3, name: "Thorne Ashwick", class: "Rogue", level: 9, hp: 55, maxHp: 62, ac: 17, player: "Jake", status: "poisoned", icon: "eye" },
    { id: 4, name: "Bronwyn Ironfist", class: "Cleric", level: 9, hp: 68, maxHp: 70, ac: 18, player: "Emma", status: "healthy", icon: "heart" },
    { id: 5, name: "Fenris Darkmoor", class: "Ranger", level: 9, hp: 30, maxHp: 58, ac: 16, player: "Alex", status: "wounded", icon: "crosshair" }
  ],
  quests: [
    { id: 1, title: "Retrieve the Crown of Aldenmire", type: "main", status: "active", urgency: "high", linkedFaction: "The Silver Accord", linkedRegion: "Aldenmire Ruins" },
    { id: 2, title: "Investigate the Blighted Marsh", type: "side", status: "active", urgency: "medium", linkedFaction: "Marsh Wardens", linkedRegion: "Greymoor Marshes" },
    { id: 3, title: "Escort the Merchant Caravan", type: "side", status: "completed", urgency: "low", linkedFaction: "Merchant Guild", linkedRegion: "King's Road" },
    { id: 4, title: "Destroy the Shadow Obelisk", type: "main", status: "active", urgency: "critical", linkedFaction: "The Hollow", linkedRegion: "Shadowfen" },
    { id: 5, title: "Win the Tournament of Blades", type: "side", status: "upcoming", urgency: "low", linkedFaction: "Kingdom of Valdris", linkedRegion: "Valdris Capital" }
  ],
  factions: [
    { id: 1, name: "The Silver Accord", attitude: "allied", power: 72, trend: "rising", description: "Coalition of free cities opposing the Hollow", color: "#94a3b8" },
    { id: 2, name: "The Hollow", attitude: "hostile", power: 88, trend: "rising", description: "Shadow cult seeking the Shattered Crown", color: "#7c3aed" },
    { id: 3, name: "Kingdom of Valdris", attitude: "neutral", power: 65, trend: "declining", description: "Once-mighty kingdom weakened by civil war", color: "#d97706" },
    { id: 4, name: "Marsh Wardens", attitude: "friendly", power: 30, trend: "stable", description: "Druidic guardians of the Greymoor Marshes", color: "#059669" },
    { id: 5, name: "Merchant Guild", attitude: "friendly", power: 55, trend: "rising", description: "Trade consortium with vast information networks", color: "#dc2626" }
  ],
  regions: [
    { id: 1, name: "Valdris Capital", type: "city", controlledBy: "Kingdom of Valdris", threat: "low", state: "tense", partyVisited: true },
    { id: 2, name: "Greymoor Marshes", type: "wilderness", controlledBy: "Marsh Wardens", threat: "medium", state: "corrupted", partyVisited: true },
    { id: 3, name: "Aldenmire Ruins", type: "dungeon", controlledBy: "The Hollow", threat: "extreme", state: "dangerous", partyVisited: false },
    { id: 4, name: "Thornhaven", type: "town", controlledBy: "The Silver Accord", threat: "low", state: "rebuilding", partyVisited: true },
    { id: 5, name: "Shadowfen", type: "wilderness", controlledBy: "The Hollow", threat: "high", state: "blighted", partyVisited: true },
    { id: 6, name: "King's Road", type: "route", controlledBy: "Kingdom of Valdris", threat: "medium", state: "patrolled", partyVisited: true }
  ],
  npcs: [
    { id: 1, name: "Commander Elara Voss", faction: "The Silver Accord", location: "Thornhaven", attitude: "allied", role: "quest giver", alive: true },
    { id: 2, name: "The Whisper King", faction: "The Hollow", location: "Unknown", attitude: "hostile", role: "antagonist", alive: true },
    { id: 3, name: "Barkeep Milo", faction: null, location: "Thornhaven", attitude: "friendly", role: "informant", alive: true },
    { id: 4, name: "Warden Thistle", faction: "Marsh Wardens", location: "Greymoor Marshes", attitude: "cautious", role: "ally", alive: true },
    { id: 5, name: "Lord Aldric Valdris", faction: "Kingdom of Valdris", location: "Valdris Capital", attitude: "neutral", role: "political", alive: true },
    { id: 6, name: "Seraphine the Lost", faction: "The Hollow", location: "Shadowfen", attitude: "hostile", role: "lieutenant", alive: false }
  ],
  timeline: [
    {
      id: 24, number: 24, title: "Into the Shadowfen", date: "2026-03-26", status: "completed",
      summary: "The party ventured into the Shadowfen seeking the Shadow Obelisk. They fought corrupted beasts and discovered Seraphine the Lost guarding a ritual site. After a fierce battle, Seraphine was defeated but the obelisk remains active.",
      events: [
        { type: "encounter", text: "Ambush by 6 Blighted Wolves in the outer marshes", outcome: "Victory — Fenris badly wounded" },
        { type: "discovery", text: "Found Seraphine's journal revealing the Crown's true location: Aldenmire", outcome: "New quest lead unlocked" },
        { type: "encounter", text: "Boss fight: Seraphine the Lost (CR 11 Shadow Mage)", outcome: "Seraphine slain, obelisk still active" },
        { type: "world_change", text: "The Hollow's grip on Shadowfen weakens slightly", outcome: "Faction power shift" },
        { type: "loot", text: "Acquired Seraphine's Shadow Staff and encoded map", outcome: "Key item obtained" }
      ],
      worldChanges: ["Seraphine the Lost killed", "Hollow power in Shadowfen reduced", "Encoded map reveals Aldenmire path"],
      notesCount: 7
    },
    {
      id: 23, number: 23, title: "The Warden's Warning", date: "2026-03-19", status: "completed",
      summary: "Warden Thistle warned the party about growing darkness in the marshes. The party helped defend a druidic shrine and earned the Marsh Wardens' trust.",
      events: [
        { type: "roleplay", text: "Extended negotiation with Warden Thistle for safe passage", outcome: "Alliance formed" },
        { type: "encounter", text: "Defense of the Moonwell Shrine against shadow creatures", outcome: "Shrine protected" },
        { type: "world_change", text: "Marsh Wardens formally allied with the party", outcome: "Faction relationship upgrade" }
      ],
      worldChanges: ["Marsh Wardens now allied", "Moonwell Shrine protected"],
      notesCount: 4
    },
    {
      id: 22, number: 22, title: "Crossroads at King's Road", date: "2026-03-12", status: "completed",
      summary: "Completed the merchant escort quest. Encountered Hollow agents on the road. Learned about political tensions in Valdris.",
      events: [
        { type: "encounter", text: "Hollow ambush on the merchant caravan", outcome: "Repelled, captured one agent" },
        { type: "roleplay", text: "Interrogation of captured Hollow agent", outcome: "Learned of Aldenmire excavation" },
        { type: "quest_complete", text: "Merchant caravan delivered safely to Thornhaven", outcome: "Gold reward + merchant guild favor" }
      ],
      worldChanges: ["Merchant Guild favor increased", "Intelligence on Hollow operations gained"],
      notesCount: 3
    },
    {
      id: 21, number: 21, title: "The Gathering Storm", date: "2026-03-05", status: "completed",
      summary: "Party arrived in Thornhaven. Met Commander Voss, learned about the Shattered Crown's history and the Silver Accord's formation.",
      events: [
        { type: "roleplay", text: "Council meeting with Silver Accord leadership", outcome: "Main quest briefing received" },
        { type: "discovery", text: "Ancient texts in Thornhaven library hint at Crown's power", outcome: "Lore unlocked" }
      ],
      worldChanges: ["Silver Accord quest line activated"],
      notesCount: 5
    }
  ],
  recentActivity: [
    { time: "2h ago", text: "Added session 24 notes and loot distribution", icon: "scroll" },
    { time: "5h ago", text: "Updated Fenris HP after healing rest", icon: "heart" },
    { time: "1d ago", text: "Marked Seraphine the Lost as deceased", icon: "skull" },
    { time: "1d ago", text: "Updated Hollow faction power (-5)", icon: "trending-down" },
    { time: "2d ago", text: "Added encoded map to party inventory", icon: "map" },
    { time: "3d ago", text: "Scheduled next session: April 2nd", icon: "calendar" }
  ]
};

// ─── THEME COLORS ───────────────────────────────────────────────────────────

const theme = {
  parchment: "#f5f0e1",
  parchmentDark: "#e8dcc8",
  parchmentDeep: "#d4c5a9",
  ink: "#2c1810",
  inkLight: "#5c4033",
  inkMuted: "#8b7355",
  accent: "#8b4513",
  accentGold: "#c9a84c",
  danger: "#8b0000",
  success: "#2d5a27",
  water: "#4a6fa5",
  shadow: "#1a0f0a"
};

// ─── UTILITY COMPONENTS ─────────────────────────────────────────────────────

const Badge = ({ children, variant = "default", small = false }) => {
  const styles = {
    default: { background: theme.parchmentDark, color: theme.ink, border: `1px solid ${theme.parchmentDeep}` },
    danger: { background: "#3d0c0c", color: "#f0a0a0", border: "1px solid #5a1a1a" },
    success: { background: "#0c2d0c", color: "#90d090", border: "1px solid #1a4a1a" },
    warning: { background: "#3d2c0c", color: "#f0d090", border: "1px solid #5a4a1a" },
    info: { background: "#0c1a3d", color: "#90b8f0", border: "1px solid #1a2a5a" },
    critical: { background: "#4a0000", color: "#ff6666", border: "1px solid #6a0000" },
    muted: { background: "rgba(139,115,85,0.15)", color: theme.inkMuted, border: "1px solid rgba(139,115,85,0.2)" }
  };
  return (
    <span style={{
      ...styles[variant],
      padding: small ? "1px 6px" : "2px 10px",
      borderRadius: "4px",
      fontSize: small ? "10px" : "11px",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px"
    }}>
      {children}
    </span>
  );
};

const ProgressBar = ({ value, max, color = theme.accentGold, height = 6, showLabel = false }) => {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
      <div style={{ flex: 1, height, background: "rgba(0,0,0,0.2)", borderRadius: height / 2, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", background: color,
          borderRadius: height / 2, transition: "width 0.6s ease"
        }} />
      </div>
      {showLabel && <span style={{ fontSize: "11px", color: theme.inkMuted, minWidth: "32px" }}>{pct}%</span>}
    </div>
  );
};

const Card = ({ children, style = {}, onClick, hoverable = false, active = false }) => (
  <div onClick={onClick} style={{
    background: active ? "rgba(139,69,19,0.08)" : "rgba(245,240,225,0.6)",
    border: `1px solid ${active ? theme.accent : "rgba(139,115,85,0.2)"}`,
    borderRadius: "8px",
    padding: "16px",
    cursor: onClick ? "pointer" : "default",
    transition: "all 0.2s ease",
    ...(hoverable && onClick ? { ":hover": { borderColor: theme.accent } } : {}),
    ...style
  }}>
    {children}
  </div>
);

const SectionHeader = ({ icon: Icon, title, action, count }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      {Icon && <Icon size={16} color={theme.accent} />}
      <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: theme.ink, textTransform: "uppercase", letterSpacing: "1px" }}>
        {title}
      </h3>
      {count !== undefined && (
        <span style={{ fontSize: "11px", color: theme.inkMuted, background: "rgba(0,0,0,0.06)", padding: "1px 7px", borderRadius: "10px" }}>{count}</span>
      )}
    </div>
    {action}
  </div>
);

const IconBtn = ({ icon: Icon, onClick, size = 14, title, active = false }) => (
  <button onClick={onClick} title={title} style={{
    background: active ? "rgba(139,69,19,0.15)" : "none", border: "1px solid rgba(139,115,85,0.2)",
    borderRadius: "4px", padding: "4px 6px", cursor: "pointer", display: "flex", alignItems: "center",
    color: active ? theme.accent : theme.inkMuted, transition: "all 0.15s"
  }}>
    <Icon size={size} />
  </button>
);

// ─── COUNTDOWN HOOK ─────────────────────────────────────────────────────────

function useCountdown(targetDate) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) { setRemaining("Now!"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [targetDate]);
  return remaining;
}

// ─── DICE ROLLER ────────────────────────────────────────────────────────────

function DiceRoller() {
  const [results, setResults] = useState([]);
  const [selectedDie, setSelectedDie] = useState(20);
  const [modifier, setModifier] = useState(0);
  const [rolling, setRolling] = useState(false);
  const dice = [4, 6, 8, 10, 12, 20, 100];

  const roll = useCallback(() => {
    setRolling(true);
    setTimeout(() => {
      const result = Math.floor(Math.random() * selectedDie) + 1;
      const total = result + modifier;
      const isCrit = selectedDie === 20 && result === 20;
      const isFumble = selectedDie === 20 && result === 1;
      setResults(prev => [{ die: selectedDie, result, modifier, total, isCrit, isFumble, time: Date.now() }, ...prev].slice(0, 12));
      setRolling(false);
    }, 300);
  }, [selectedDie, modifier]);

  return (
    <div>
      <div style={{ display: "flex", gap: "4px", marginBottom: "10px", flexWrap: "wrap" }}>
        {dice.map(d => (
          <button key={d} onClick={() => setSelectedDie(d)} style={{
            padding: "6px 10px", border: `1px solid ${d === selectedDie ? theme.accent : "rgba(139,115,85,0.3)"}`,
            borderRadius: "4px", background: d === selectedDie ? "rgba(139,69,19,0.15)" : "transparent",
            color: d === selectedDie ? theme.accent : theme.inkLight, cursor: "pointer",
            fontSize: "12px", fontWeight: 600, transition: "all 0.15s"
          }}>d{d}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
        <span style={{ fontSize: "11px", color: theme.inkMuted }}>MOD</span>
        <button onClick={() => setModifier(m => m - 1)} style={{ background: "none", border: "1px solid rgba(139,115,85,0.3)", borderRadius: "3px", padding: "2px 8px", cursor: "pointer", color: theme.inkLight }}>-</button>
        <span style={{ fontSize: "14px", fontWeight: 700, color: theme.ink, minWidth: "24px", textAlign: "center" }}>{modifier >= 0 ? `+${modifier}` : modifier}</span>
        <button onClick={() => setModifier(m => m + 1)} style={{ background: "none", border: "1px solid rgba(139,115,85,0.3)", borderRadius: "3px", padding: "2px 8px", cursor: "pointer", color: theme.inkLight }}>+</button>
        <button onClick={roll} disabled={rolling} style={{
          marginLeft: "auto", padding: "8px 20px", background: rolling ? theme.inkMuted : theme.accent,
          color: theme.parchment, border: "none", borderRadius: "6px", cursor: rolling ? "default" : "pointer",
          fontWeight: 700, fontSize: "13px", letterSpacing: "0.5px", transition: "all 0.15s",
          display: "flex", alignItems: "center", gap: "6px"
        }}>
          <Dice6 size={14} style={{ animation: rolling ? "spin 0.3s linear infinite" : "none" }} />
          {rolling ? "..." : `Roll d${selectedDie}`}
        </button>
      </div>
      {results.length > 0 && (
        <div style={{ maxHeight: "180px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
          {results.map((r, i) => (
            <div key={r.time} style={{
              display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px",
              background: i === 0 ? (r.isCrit ? "rgba(201,168,76,0.15)" : r.isFumble ? "rgba(139,0,0,0.1)" : "rgba(0,0,0,0.04)") : "transparent",
              borderRadius: "4px", borderLeft: i === 0 ? `3px solid ${r.isCrit ? theme.accentGold : r.isFumble ? theme.danger : theme.accent}` : "3px solid transparent",
              opacity: i === 0 ? 1 : 0.5 + (1 - i / results.length) * 0.5
            }}>
              <span style={{ fontSize: "11px", color: theme.inkMuted, minWidth: "28px" }}>d{r.die}</span>
              <span style={{ fontSize: "16px", fontWeight: 800, color: r.isCrit ? theme.accentGold : r.isFumble ? theme.danger : theme.ink }}>{r.result}</span>
              {r.modifier !== 0 && <span style={{ fontSize: "11px", color: theme.inkMuted }}>{r.modifier > 0 ? `+${r.modifier}` : r.modifier}</span>}
              {r.modifier !== 0 && <span style={{ fontSize: "13px", fontWeight: 700, color: theme.inkLight }}>= {r.total}</span>}
              {r.isCrit && <Badge variant="warning" small>CRIT!</Badge>}
              {r.isFumble && <Badge variant="danger" small>FUMBLE</Badge>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── INITIATIVE TRACKER ─────────────────────────────────────────────────────

function InitiativeTracker({ party }) {
  const [combatants, setCombatants] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [round, setRound] = useState(1);
  const [inCombat, setInCombat] = useState(false);
  const [newName, setNewName] = useState("");
  const [newInit, setNewInit] = useState("");

  const startCombat = () => {
    const pcs = party.map(p => ({
      id: `pc-${p.id}`, name: p.name, initiative: Math.floor(Math.random() * 20) + 1,
      hp: p.hp, maxHp: p.maxHp, ac: p.ac, type: "pc", class: p.class
    }));
    const enemies = [
      { id: "e1", name: "Shadow Horror", initiative: Math.floor(Math.random() * 20) + 3, hp: 95, maxHp: 95, ac: 16, type: "enemy" },
      { id: "e2", name: "Hollow Cultist", initiative: Math.floor(Math.random() * 20) + 1, hp: 32, maxHp: 32, ac: 13, type: "enemy" },
      { id: "e3", name: "Hollow Cultist", initiative: Math.floor(Math.random() * 20) + 1, hp: 32, maxHp: 32, ac: 13, type: "enemy" }
    ];
    setCombatants([...pcs, ...enemies].sort((a, b) => b.initiative - a.initiative));
    setCurrentTurn(0);
    setRound(1);
    setInCombat(true);
  };

  const nextTurn = () => {
    if (currentTurn >= combatants.length - 1) {
      setCurrentTurn(0);
      setRound(r => r + 1);
    } else {
      setCurrentTurn(t => t + 1);
    }
  };

  const adjustHp = (id, delta) => {
    setCombatants(prev => prev.map(c => c.id === id ? { ...c, hp: Math.max(0, Math.min(c.maxHp, c.hp + delta)) } : c));
  };

  const addCombatant = () => {
    if (!newName.trim() || !newInit) return;
    const entry = { id: `custom-${Date.now()}`, name: newName, initiative: parseInt(newInit), hp: 30, maxHp: 30, ac: 12, type: "enemy" };
    setCombatants(prev => [...prev, entry].sort((a, b) => b.initiative - a.initiative));
    setNewName("");
    setNewInit("");
  };

  if (!inCombat) {
    return (
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <Swords size={32} color={theme.inkMuted} style={{ marginBottom: "8px" }} />
        <p style={{ color: theme.inkMuted, fontSize: "13px", marginBottom: "16px" }}>No active encounter</p>
        <button onClick={startCombat} style={{
          padding: "10px 24px", background: theme.danger, color: theme.parchment,
          border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 700, fontSize: "13px",
          display: "inline-flex", alignItems: "center", gap: "8px"
        }}>
          <Swords size={14} /> Start Encounter
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Badge variant="danger">Round {round}</Badge>
          <span style={{ fontSize: "12px", color: theme.inkMuted }}>Turn {currentTurn + 1}/{combatants.length}</span>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          <button onClick={nextTurn} style={{
            padding: "5px 12px", background: theme.accent, color: theme.parchment,
            border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: 600,
            display: "flex", alignItems: "center", gap: "4px"
          }}>
            <SkipForward size={12} /> Next
          </button>
          <button onClick={() => setInCombat(false)} style={{
            padding: "5px 12px", background: "rgba(139,0,0,0.15)", color: theme.danger,
            border: `1px solid ${theme.danger}`, borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: 600
          }}>End</button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "3px", maxHeight: "260px", overflowY: "auto" }}>
        {combatants.map((c, i) => (
          <div key={c.id} style={{
            display: "flex", alignItems: "center", gap: "8px", padding: "7px 10px",
            background: i === currentTurn ? "rgba(139,69,19,0.12)" : c.hp <= 0 ? "rgba(0,0,0,0.06)" : "transparent",
            borderRadius: "5px", borderLeft: i === currentTurn ? `3px solid ${theme.accent}` : "3px solid transparent",
            opacity: c.hp <= 0 ? 0.4 : 1
          }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: theme.inkMuted, minWidth: "20px" }}>{c.initiative}</span>
            <span style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: c.type === "pc" ? theme.success : theme.danger, flexShrink: 0
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: theme.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
            </div>
            <span style={{ fontSize: "10px", color: theme.inkMuted }}>AC {c.ac}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
              <button onClick={() => adjustHp(c.id, -5)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.danger, fontSize: "12px", padding: "2px" }}>-</button>
              <span style={{
                fontSize: "11px", fontWeight: 700, minWidth: "38px", textAlign: "center",
                color: c.hp <= c.maxHp * 0.25 ? theme.danger : c.hp <= c.maxHp * 0.5 ? "#b45309" : theme.ink
              }}>{c.hp}/{c.maxHp}</span>
              <button onClick={() => adjustHp(c.id, 5)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.success, fontSize: "12px", padding: "2px" }}>+</button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "4px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(139,115,85,0.15)" }}>
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" style={{
          flex: 1, padding: "5px 8px", border: "1px solid rgba(139,115,85,0.3)", borderRadius: "4px",
          background: "rgba(0,0,0,0.03)", fontSize: "11px", color: theme.ink, outline: "none"
        }} />
        <input value={newInit} onChange={e => setNewInit(e.target.value)} placeholder="Init" type="number" style={{
          width: "46px", padding: "5px 6px", border: "1px solid rgba(139,115,85,0.3)", borderRadius: "4px",
          background: "rgba(0,0,0,0.03)", fontSize: "11px", color: theme.ink, outline: "none", textAlign: "center"
        }} />
        <button onClick={addCombatant} style={{
          padding: "5px 10px", background: "rgba(139,115,85,0.1)", border: "1px solid rgba(139,115,85,0.3)",
          borderRadius: "4px", cursor: "pointer", color: theme.inkLight, fontSize: "11px"
        }}>
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── MAIN TAB VIEWS ─────────────────────────────────────────────────────────

// ─── DASHBOARD ──────────────────────────────────────────────────────────────

function DashboardView({ data, onNavigate }) {
  const countdown = useCountdown(data.nextSession);

  const urgencyVariant = { critical: "critical", high: "danger", medium: "warning", low: "muted" };
  const activeQuests = data.quests.filter(q => q.status === "active");
  const guidedSteps = [
    { done: true, text: "Party created with 5 members" },
    { done: true, text: "24 sessions logged" },
    { done: true, text: "World regions established" },
    { done: false, text: "Prep session 25: Aldenmire Ruins expedition" },
    { done: false, text: "Add encounters for Aldenmire dungeon" },
    { done: false, text: "Review Hollow faction response to Seraphine's defeat" }
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", padding: "20px" }}>
      {/* LEFT COLUMN */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Campaign Status Banner */}
        <div style={{
          background: `linear-gradient(135deg, rgba(139,69,19,0.08) 0%, rgba(201,168,76,0.06) 100%)`,
          border: `1px solid rgba(139,69,19,0.15)`, borderRadius: "10px", padding: "20px",
          display: "grid", gridTemplateColumns: "1fr auto", gap: "20px", alignItems: "center"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: theme.ink, fontFamily: "Georgia, serif" }}>
                {data.name}
              </h2>
              <Badge variant="success">Active</Badge>
            </div>
            <p style={{ margin: 0, fontSize: "13px", color: theme.inkMuted }}>
              {data.sessionsPlayed} sessions played since {new Date(data.startDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: theme.inkMuted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "2px" }}>Next Session</div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: theme.accent, fontFamily: "Georgia, serif" }}>{countdown}</div>
            <div style={{ fontSize: "12px", color: theme.inkLight }}>
              {new Date(data.nextSession).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </div>
          </div>
        </div>

        {/* Party Overview */}
        <Card>
          <SectionHeader icon={Users} title="The Party" count={data.party.length} action={
            <button onClick={() => onNavigate("play")} style={{ fontSize: "11px", color: theme.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
              Open Play Mode <ArrowRight size={10} style={{ verticalAlign: "middle" }} />
            </button>
          } />
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {data.party.map(p => (
              <div key={p.id} style={{
                flex: "1 1 140px", padding: "10px 12px",
                background: "rgba(0,0,0,0.03)", borderRadius: "6px",
                borderLeft: `3px solid ${p.status === "wounded" ? theme.danger : p.status === "poisoned" ? "#7c3aed" : theme.success}`
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "4px" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: theme.ink }}>{p.name}</div>
                    <div style={{ fontSize: "11px", color: theme.inkMuted }}>Lv{p.level} {p.class} — {p.player}</div>
                  </div>
                  {p.status !== "healthy" && <Badge variant={p.status === "wounded" ? "danger" : "warning"} small>{p.status}</Badge>}
                </div>
                <div style={{ marginTop: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: theme.inkMuted, marginBottom: "2px" }}>
                    <span>HP</span><span>{p.hp}/{p.maxHp}</span>
                  </div>
                  <ProgressBar value={p.hp} max={p.maxHp} color={p.hp < p.maxHp * 0.3 ? theme.danger : p.hp < p.maxHp * 0.6 ? "#b45309" : theme.success} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Active Quests */}
        <Card>
          <SectionHeader icon={Scroll} title="Active Quests" count={activeQuests.length} />
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {activeQuests.sort((a, b) => {
              const ord = { critical: 0, high: 1, medium: 2, low: 3 };
              return (ord[a.urgency] ?? 9) - (ord[b.urgency] ?? 9);
            }).map(q => (
              <div key={q.id} style={{
                display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px",
                background: q.urgency === "critical" ? "rgba(139,0,0,0.04)" : "rgba(0,0,0,0.02)",
                borderRadius: "6px", borderLeft: `3px solid ${q.urgency === "critical" ? theme.danger : q.urgency === "high" ? "#b45309" : q.urgency === "medium" ? theme.accentGold : theme.inkMuted}`
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: theme.ink }}>{q.title}</div>
                  <div style={{ fontSize: "11px", color: theme.inkMuted, display: "flex", gap: "12px", marginTop: "2px" }}>
                    <span><MapPin size={10} style={{ verticalAlign: "middle" }} /> {q.linkedRegion}</span>
                    <span><Flag size={10} style={{ verticalAlign: "middle" }} /> {q.linkedFaction}</span>
                  </div>
                </div>
                <Badge variant={urgencyVariant[q.urgency]} small>{q.urgency}</Badge>
                <Badge variant={q.type === "main" ? "info" : "muted"} small>{q.type}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* World State Summary */}
        <Card>
          <SectionHeader icon={Globe} title="World State" action={
            <button onClick={() => onNavigate("world")} style={{ fontSize: "11px", color: theme.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
              Full Map <ArrowRight size={10} style={{ verticalAlign: "middle" }} />
            </button>
          } />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {data.factions.map(f => (
              <div key={f.id} style={{
                padding: "10px 12px", background: "rgba(0,0,0,0.02)", borderRadius: "6px",
                borderLeft: `3px solid ${f.color}`
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: theme.ink }}>{f.name}</span>
                  {f.trend === "rising" ? <TrendingUp size={12} color={theme.danger} /> : f.trend === "declining" ? <TrendingDown size={12} color={theme.success} /> : <Minus size={12} color={theme.inkMuted} />}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Badge variant={f.attitude === "allied" || f.attitude === "friendly" ? "success" : f.attitude === "hostile" ? "danger" : "muted"} small>{f.attitude}</Badge>
                  <span style={{ fontSize: "10px", color: theme.inkMuted }}>Power {f.power}</span>
                </div>
                <div style={{ marginTop: "4px" }}>
                  <ProgressBar value={f.power} max={100} color={f.color} height={4} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* RIGHT SIDEBAR */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* What's Next Panel */}
        <Card style={{ background: "rgba(139,69,19,0.06)", border: `1px solid rgba(139,69,19,0.15)` }}>
          <SectionHeader icon={Compass} title="What's Next" />
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {guidedSteps.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "start", gap: "8px", padding: "6px 0", opacity: s.done ? 0.5 : 1 }}>
                {s.done ? <CheckCircle size={14} color={theme.success} style={{ marginTop: "1px", flexShrink: 0 }} /> : <Circle size={14} color={theme.accent} style={{ marginTop: "1px", flexShrink: 0 }} />}
                <span style={{ fontSize: "12px", color: s.done ? theme.inkMuted : theme.ink, textDecoration: s.done ? "line-through" : "none" }}>{s.text}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Latest Session */}
        <Card>
          <SectionHeader icon={BookOpen} title="Latest Session" />
          <div style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: theme.accent }}>#{data.timeline[0].number}</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: theme.ink, fontFamily: "Georgia, serif" }}>{data.timeline[0].title}</span>
            </div>
            <div style={{ fontSize: "11px", color: theme.inkMuted, marginBottom: "6px" }}>{data.timeline[0].date}</div>
            <p style={{ fontSize: "12px", color: theme.inkLight, lineHeight: 1.5, margin: 0 }}>{data.timeline[0].summary}</p>
          </div>
          <div style={{ fontSize: "11px", color: theme.inkMuted }}>
            {data.timeline[0].events.length} events — {data.timeline[0].worldChanges.length} world changes — {data.timeline[0].notesCount} notes
          </div>
          <button onClick={() => onNavigate("timeline")} style={{
            marginTop: "10px", width: "100%", padding: "8px", background: "rgba(0,0,0,0.04)",
            border: "1px solid rgba(139,115,85,0.2)", borderRadius: "6px", cursor: "pointer",
            fontSize: "12px", color: theme.accent, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
          }}>
            View Full Timeline <ArrowRight size={12} />
          </button>
        </Card>

        {/* Recent Activity */}
        <Card>
          <SectionHeader icon={Activity} title="Recent Activity" />
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {data.recentActivity.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "start", gap: "8px", padding: "4px 0", borderBottom: i < data.recentActivity.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none" }}>
                <span style={{ fontSize: "10px", color: theme.inkMuted, minWidth: "36px", marginTop: "2px" }}>{a.time}</span>
                <span style={{ fontSize: "12px", color: theme.inkLight, lineHeight: 1.4 }}>{a.text}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── TIMELINE ───────────────────────────────────────────────────────────────

function TimelineView({ data }) {
  const [expanded, setExpanded] = useState(new Set([data.timeline[0].id]));
  const toggle = id => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const eventIcons = { encounter: Swords, discovery: Search, roleplay: Users, world_change: Globe, loot: Star, quest_complete: CheckCircle };
  const eventColors = { encounter: theme.danger, discovery: theme.water, roleplay: theme.accentGold, world_change: "#7c3aed", loot: theme.accentGold, quest_complete: theme.success };

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: theme.ink, fontFamily: "Georgia, serif" }}>Campaign Timeline</h2>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: theme.inkMuted }}>{data.timeline.length} sessions recorded — The Shattered Crown</p>
        </div>
        <button style={{
          padding: "8px 16px", background: theme.accent, color: theme.parchment,
          border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 700, fontSize: "12px",
          display: "flex", alignItems: "center", gap: "6px"
        }}>
          <Plus size={14} /> New Session
        </button>
      </div>

      <div style={{ position: "relative" }}>
        {/* Vertical timeline line */}
        <div style={{
          position: "absolute", left: "18px", top: 0, bottom: 0, width: "2px",
          background: `linear-gradient(180deg, ${theme.accent} 0%, ${theme.parchmentDeep} 100%)`
        }} />

        {data.timeline.map((session, idx) => {
          const isOpen = expanded.has(session.id);
          const isLatest = idx === 0;
          return (
            <div key={session.id} style={{ position: "relative", marginBottom: "12px", paddingLeft: "48px" }}>
              {/* Timeline dot */}
              <div style={{
                position: "absolute", left: "10px", top: "18px",
                width: isLatest ? "18px" : "14px", height: isLatest ? "18px" : "14px",
                borderRadius: "50%", background: isLatest ? theme.accent : theme.parchmentDark,
                border: `2px solid ${isLatest ? theme.accent : theme.inkMuted}`,
                zIndex: 1, boxShadow: isLatest ? `0 0 8px rgba(139,69,19,0.3)` : "none",
                transform: isLatest ? "translate(-2px, 0)" : "none"
              }} />

              <div onClick={() => toggle(session.id)} style={{
                background: isOpen ? "rgba(139,69,19,0.05)" : "rgba(245,240,225,0.6)",
                border: `1px solid ${isOpen ? "rgba(139,69,19,0.2)" : "rgba(139,115,85,0.15)"}`,
                borderRadius: "8px", cursor: "pointer", transition: "all 0.2s ease", overflow: "hidden"
              }}>
                {/* Session header */}
                <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
                  {isOpen ? <ChevronDown size={16} color={theme.inkMuted} /> : <ChevronRight size={16} color={theme.inkMuted} />}
                  <span style={{
                    fontSize: "12px", fontWeight: 800, color: theme.accent,
                    background: "rgba(139,69,19,0.08)", padding: "2px 8px", borderRadius: "4px"
                  }}>#{session.number}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: theme.ink, fontFamily: "Georgia, serif" }}>
                      {session.title}
                    </span>
                    <span style={{ fontSize: "12px", color: theme.inkMuted, marginLeft: "10px" }}>{session.date}</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <Badge variant="muted" small>{session.events.length} events</Badge>
                    {session.worldChanges.length > 0 && <Badge variant="warning" small>{session.worldChanges.length} changes</Badge>}
                  </div>
                </div>

                {/* Expanded content */}
                {isOpen && (
                  <div onClick={e => e.stopPropagation()} style={{ padding: "0 16px 16px", cursor: "default" }}>
                    <p style={{ fontSize: "13px", color: theme.inkLight, lineHeight: 1.6, margin: "0 0 16px", paddingLeft: "28px" }}>
                      {session.summary}
                    </p>

                    {/* Events */}
                    <div style={{ marginBottom: "14px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: theme.inkMuted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", paddingLeft: "28px" }}>Events</div>
                      {session.events.map((ev, i) => {
                        const Icon = eventIcons[ev.type] || Circle;
                        const col = eventColors[ev.type] || theme.inkMuted;
                        return (
                          <div key={i} style={{
                            display: "flex", gap: "10px", padding: "8px 0 8px 28px", alignItems: "start",
                            borderBottom: i < session.events.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none"
                          }}>
                            <Icon size={14} color={col} style={{ marginTop: "2px", flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "12px", color: theme.ink }}>{ev.text}</div>
                              <div style={{ fontSize: "11px", color: theme.inkMuted, marginTop: "2px" }}>
                                <ArrowRight size={10} style={{ verticalAlign: "middle" }} /> {ev.outcome}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* World Changes */}
                    {session.worldChanges.length > 0 && (
                      <div style={{ paddingLeft: "28px" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: theme.inkMuted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>World State Changes</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {session.worldChanges.map((wc, i) => (
                            <Badge key={i} variant="warning">{wc}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── WORLD STATE ────────────────────────────────────────────────────────────

function WorldView({ data }) {
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [entityType, setEntityType] = useState(null);
  const [worldTab, setWorldTab] = useState("regions");

  const getConnections = (type, entity) => {
    const connections = [];
    if (type === "region") {
      const faction = data.factions.find(f => f.name === entity.controlledBy);
      if (faction) connections.push({ type: "faction", entity: faction, label: "Controlled by" });
      data.npcs.filter(n => n.location === entity.name).forEach(n => connections.push({ type: "npc", entity: n, label: "Located here" }));
      data.quests.filter(q => q.linkedRegion === entity.name).forEach(q => connections.push({ type: "quest", entity: q, label: "Active quest" }));
    } else if (type === "faction") {
      data.regions.filter(r => r.controlledBy === entity.name).forEach(r => connections.push({ type: "region", entity: r, label: "Controls" }));
      data.npcs.filter(n => n.faction === entity.name).forEach(n => connections.push({ type: "npc", entity: n, label: "Member" }));
      data.quests.filter(q => q.linkedFaction === entity.name).forEach(q => connections.push({ type: "quest", entity: q, label: "Related quest" }));
    } else if (type === "npc") {
      if (entity.faction) {
        const f = data.factions.find(f => f.name === entity.faction);
        if (f) connections.push({ type: "faction", entity: f, label: "Member of" });
      }
      const r = data.regions.find(r => r.name === entity.location);
      if (r) connections.push({ type: "region", entity: r, label: "Located in" });
    }
    return connections;
  };

  const regionIcons = { city: Castle, town: Castle, wilderness: Mountain, dungeon: Skull, route: MapPin };
  const threatColors = { low: theme.success, medium: theme.accentGold, high: "#b45309", extreme: theme.danger };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "20px", padding: "20px", height: "calc(100vh - 60px)" }}>
      {/* Main content */}
      <div style={{ overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: theme.ink, fontFamily: "Georgia, serif" }}>World State</h2>
          <div style={{ display: "flex", gap: "4px" }}>
            {["regions", "factions", "npcs"].map(tab => (
              <button key={tab} onClick={() => { setWorldTab(tab); setSelectedEntity(null); }} style={{
                padding: "6px 14px", border: `1px solid ${worldTab === tab ? theme.accent : "rgba(139,115,85,0.2)"}`,
                borderRadius: "5px", background: worldTab === tab ? "rgba(139,69,19,0.1)" : "transparent",
                color: worldTab === tab ? theme.accent : theme.inkMuted, cursor: "pointer",
                fontSize: "12px", fontWeight: 600, textTransform: "capitalize", transition: "all 0.15s"
              }}>{tab}</button>
            ))}
          </div>
        </div>

        {worldTab === "regions" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {data.regions.map(r => {
              const Icon = regionIcons[r.type] || MapPin;
              return (
                <Card key={r.id} onClick={() => { setSelectedEntity(r); setEntityType("region"); }} hoverable active={selectedEntity?.id === r.id && entityType === "region"}>
                  <div style={{ display: "flex", alignItems: "start", gap: "10px" }}>
                    <Icon size={18} color={threatColors[r.threat]} style={{ marginTop: "2px" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: theme.ink, marginBottom: "4px" }}>{r.name}</div>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "6px" }}>
                        <Badge variant={r.threat === "extreme" ? "critical" : r.threat === "high" ? "danger" : r.threat === "medium" ? "warning" : "success"} small>{r.threat} threat</Badge>
                        <Badge variant="muted" small>{r.type}</Badge>
                        {r.partyVisited && <Badge variant="info" small>visited</Badge>}
                      </div>
                      <div style={{ fontSize: "11px", color: theme.inkMuted }}>
                        {r.controlledBy} — <span style={{ fontStyle: "italic" }}>{r.state}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {worldTab === "factions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.factions.map(f => (
              <Card key={f.id} onClick={() => { setSelectedEntity(f); setEntityType("faction"); }} hoverable active={selectedEntity?.id === f.id && entityType === "faction"}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "8px", height: "40px", borderRadius: "4px", background: f.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "15px", fontWeight: 700, color: theme.ink }}>{f.name}</span>
                      <Badge variant={f.attitude === "allied" || f.attitude === "friendly" ? "success" : f.attitude === "hostile" ? "danger" : "muted"} small>{f.attitude}</Badge>
                      {f.trend === "rising" ? <TrendingUp size={12} color={theme.danger} /> : f.trend === "declining" ? <TrendingDown size={12} color={theme.success} /> : <Minus size={12} color={theme.inkMuted} />}
                    </div>
                    <p style={{ fontSize: "12px", color: theme.inkMuted, margin: "0 0 6px" }}>{f.description}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "10px", color: theme.inkMuted }}>Power</span>
                      <div style={{ flex: 1, maxWidth: "200px" }}>
                        <ProgressBar value={f.power} max={100} color={f.color} height={5} showLabel />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {worldTab === "npcs" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {data.npcs.map(n => (
              <Card key={n.id} onClick={() => { setSelectedEntity(n); setEntityType("npc"); }} hoverable active={selectedEntity?.id === n.id && entityType === "npc"}
                    style={{ opacity: n.alive ? 1 : 0.5 }}>
                <div style={{ display: "flex", alignItems: "start", gap: "10px" }}>
                  {n.alive ? <Users size={16} color={theme.inkMuted} /> : <Skull size={16} color={theme.danger} />}
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: theme.ink }}>{n.name}</div>
                    <div style={{ fontSize: "11px", color: theme.inkMuted, marginBottom: "4px" }}>{n.role} — {n.location}</div>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <Badge variant={n.attitude === "allied" || n.attitude === "friendly" ? "success" : n.attitude === "hostile" ? "danger" : n.attitude === "cautious" ? "warning" : "muted"} small>{n.attitude}</Badge>
                      {n.faction && <Badge variant="muted" small>{n.faction}</Badge>}
                      {!n.alive && <Badge variant="danger" small>deceased</Badge>}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Connection Panel */}
      <div style={{ borderLeft: "1px solid rgba(139,115,85,0.15)", paddingLeft: "20px", overflowY: "auto" }}>
        {selectedEntity ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: theme.ink, fontFamily: "Georgia, serif" }}>
                {selectedEntity.name}
              </h3>
              <button onClick={() => setSelectedEntity(null)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.inkMuted }}>
                <X size={16} />
              </button>
            </div>

            {/* Entity details */}
            <div style={{ marginBottom: "16px", padding: "12px", background: "rgba(0,0,0,0.03)", borderRadius: "6px" }}>
              {entityType === "region" && (
                <>
                  <div style={{ fontSize: "12px", color: theme.inkMuted, marginBottom: "4px" }}>Type: <strong style={{ color: theme.ink }}>{selectedEntity.type}</strong></div>
                  <div style={{ fontSize: "12px", color: theme.inkMuted, marginBottom: "4px" }}>State: <strong style={{ color: theme.ink }}>{selectedEntity.state}</strong></div>
                  <div style={{ fontSize: "12px", color: theme.inkMuted }}>Threat: <Badge variant={selectedEntity.threat === "extreme" ? "critical" : selectedEntity.threat === "high" ? "danger" : selectedEntity.threat === "medium" ? "warning" : "success"} small>{selectedEntity.threat}</Badge></div>
                </>
              )}
              {entityType === "faction" && (
                <>
                  <p style={{ fontSize: "12px", color: theme.inkLight, margin: "0 0 8px" }}>{selectedEntity.description}</p>
                  <div style={{ fontSize: "12px", color: theme.inkMuted, marginBottom: "4px" }}>Power: <strong style={{ color: theme.ink }}>{selectedEntity.power}/100</strong></div>
                  <div style={{ fontSize: "12px", color: theme.inkMuted }}>Trend: <strong style={{ color: theme.ink }}>{selectedEntity.trend}</strong></div>
                </>
              )}
              {entityType === "npc" && (
                <>
                  <div style={{ fontSize: "12px", color: theme.inkMuted, marginBottom: "4px" }}>Role: <strong style={{ color: theme.ink }}>{selectedEntity.role}</strong></div>
                  <div style={{ fontSize: "12px", color: theme.inkMuted, marginBottom: "4px" }}>Location: <strong style={{ color: theme.ink }}>{selectedEntity.location}</strong></div>
                  <div style={{ fontSize: "12px", color: theme.inkMuted }}>Status: <strong style={{ color: theme.ink }}>{selectedEntity.alive ? "Alive" : "Deceased"}</strong></div>
                </>
              )}
            </div>

            {/* Connections */}
            <SectionHeader icon={Layers} title="Connections" />
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {getConnections(entityType, selectedEntity).map((conn, i) => (
                <div key={i} onClick={() => { setSelectedEntity(conn.entity); setEntityType(conn.type); }} style={{
                  padding: "10px 12px", background: "rgba(0,0,0,0.03)", borderRadius: "6px",
                  cursor: "pointer", borderLeft: `3px solid ${conn.type === "faction" ? (conn.entity.color || theme.accent) : theme.inkMuted}`,
                  transition: "all 0.15s"
                }}>
                  <div style={{ fontSize: "10px", color: theme.inkMuted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" }}>{conn.label}</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: theme.ink }}>{conn.entity.name || conn.entity.title}</div>
                  <div style={{ fontSize: "11px", color: theme.inkMuted, marginTop: "2px" }}>{conn.type}</div>
                </div>
              ))}
              {getConnections(entityType, selectedEntity).length === 0 && (
                <p style={{ fontSize: "12px", color: theme.inkMuted, fontStyle: "italic" }}>No direct connections found.</p>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", paddingTop: "60px" }}>
            <Layers size={32} color={theme.inkMuted} style={{ marginBottom: "8px" }} />
            <p style={{ fontSize: "13px", color: theme.inkMuted }}>Select any element to view its connections across the world.</p>
            <p style={{ fontSize: "11px", color: theme.parchmentDeep }}>Regions, factions, NPCs, and quests are all interconnected.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PLAY MODE ──────────────────────────────────────────────────────────────

function PlayView({ data }) {
  const [activePanel, setActivePanel] = useState("initiative");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "0", height: "calc(100vh - 60px)" }}>
      {/* Main play area */}
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: theme.ink, fontFamily: "Georgia, serif" }}>Play Mode</h2>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: theme.inkMuted }}>Session 25 — Live DM Control Panel</p>
          </div>
          <Badge variant="danger">
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ff4444", display: "inline-block", animation: "pulse 2s infinite" }} /> LIVE
          </Badge>
        </div>

        {/* Interactive World Map */}
        <div style={{
          flex: 1, minHeight: "360px", background: "rgba(0,0,0,0.03)", borderRadius: "8px",
          border: "1px solid rgba(139,115,85,0.15)", position: "relative", overflow: "hidden"
        }}>
          {/* Stylized map visualization */}
          <svg viewBox="0 0 800 500" style={{ width: "100%", height: "100%" }}>
            {/* Water background */}
            <rect width="800" height="500" fill="rgba(74,111,165,0.08)" />

            {/* Landmasses */}
            <path d="M100,180 Q150,120 250,140 Q350,100 400,150 Q450,120 500,160 Q520,200 490,250 Q460,280 400,290 Q350,300 300,270 Q200,260 150,230 Z" fill="rgba(180,165,130,0.4)" stroke="rgba(44,24,16,0.3)" strokeWidth="1.5" />
            <path d="M520,100 Q580,80 650,120 Q700,160 680,220 Q660,260 600,250 Q550,240 530,180 Z" fill="rgba(180,165,130,0.4)" stroke="rgba(44,24,16,0.3)" strokeWidth="1.5" />
            <path d="M150,320 Q200,290 300,310 Q380,320 400,360 Q380,400 300,410 Q200,400 160,370 Z" fill="rgba(180,165,130,0.4)" stroke="rgba(44,24,16,0.3)" strokeWidth="1.5" />

            {/* Mountain markers */}
            {[[280, 160], [320, 150], [360, 155], [250, 175], [400, 165]].map(([x, y], i) => (
              <polygon key={`m${i}`} points={`${x},${y-15} ${x-8},${y+5} ${x+8},${y+5}`} fill="rgba(44,24,16,0.3)" stroke="rgba(44,24,16,0.5)" strokeWidth="1" />
            ))}

            {/* Region labels */}
            <text x="300" y="220" textAnchor="middle" fill="rgba(44,24,16,0.5)" fontSize="11" fontWeight="600" fontFamily="Georgia">Valdris Capital</text>
            <text x="350" y="245" textAnchor="middle" fill="rgba(44,24,16,0.35)" fontSize="9" fontFamily="Georgia">The Silver Accord</text>
            <text x="600" y="170" textAnchor="middle" fill="rgba(44,24,16,0.5)" fontSize="10" fontWeight="600" fontFamily="Georgia">Shadowfen</text>
            <text x="280" y="360" textAnchor="middle" fill="rgba(44,24,16,0.5)" fontSize="10" fontWeight="600" fontFamily="Georgia">Greymoor Marshes</text>
            <text x="450" y="130" textAnchor="middle" fill="rgba(44,24,16,0.4)" fontSize="9" fontFamily="Georgia">Aldenmire Ruins</text>
            <text x="180" y="200" textAnchor="middle" fill="rgba(44,24,16,0.4)" fontSize="9" fontFamily="Georgia">Thornhaven</text>

            {/* Location dots */}
            {[[300, 205, true], [600, 155, true], [280, 345, true], [450, 118, false], [180, 188, true]].map(([x, y, visited], i) => (
              <g key={`l${i}`}>
                <circle cx={x} cy={y} r={visited ? 5 : 4} fill={visited ? theme.accent : theme.inkMuted} opacity={0.8} />
                {visited && <circle cx={x} cy={y} r={8} fill="none" stroke={theme.accent} strokeWidth="1" opacity={0.3} />}
              </g>
            ))}

            {/* Party location indicator */}
            <g>
              <circle cx="580" cy="180" r="12" fill="rgba(139,69,19,0.2)" stroke={theme.accent} strokeWidth="2">
                <animate attributeName="r" values="12;16;12" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="580" cy="180" r="4" fill={theme.accent} />
              <text x="580" y="200" textAnchor="middle" fill={theme.accent} fontSize="8" fontWeight="700">PARTY</text>
            </g>

            {/* Road lines */}
            <path d="M180,190 Q240,195 300,205" fill="none" stroke="rgba(44,24,16,0.2)" strokeWidth="1" strokeDasharray="4,3" />
            <path d="M300,210 Q350,280 280,345" fill="none" stroke="rgba(44,24,16,0.15)" strokeWidth="1" strokeDasharray="3,4" />
            <path d="M300,205 Q400,180 450,118" fill="none" stroke="rgba(44,24,16,0.15)" strokeWidth="1" strokeDasharray="4,3" />
            <path d="M450,125 Q520,140 580,155" fill="none" stroke="rgba(44,24,16,0.2)" strokeWidth="1" strokeDasharray="4,3" />

            {/* Compass rose */}
            <g transform="translate(720, 430)">
              <circle r="20" fill="rgba(245,240,225,0.5)" stroke="rgba(44,24,16,0.2)" strokeWidth="1" />
              <text y="-8" textAnchor="middle" fill="rgba(44,24,16,0.5)" fontSize="8" fontWeight="700">N</text>
              <line x1="0" y1="-6" x2="0" y2="6" stroke="rgba(44,24,16,0.3)" strokeWidth="1" />
              <line x1="-6" y1="0" x2="6" y2="0" stroke="rgba(44,24,16,0.3)" strokeWidth="1" />
            </g>
          </svg>
        </div>

        {/* NPC Quick Reference */}
        <Card>
          <SectionHeader icon={Users} title="NPC Quick Reference" count={data.npcs.filter(n => n.alive).length} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
            {data.npcs.filter(n => n.alive).map(n => (
              <div key={n.id} style={{
                padding: "8px 10px", background: "rgba(0,0,0,0.02)", borderRadius: "5px",
                borderLeft: `2px solid ${n.attitude === "allied" || n.attitude === "friendly" ? theme.success : n.attitude === "hostile" ? theme.danger : theme.accentGold}`
              }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: theme.ink }}>{n.name}</div>
                <div style={{ fontSize: "10px", color: theme.inkMuted }}>{n.role} — {n.location}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Right control panel */}
      <div style={{
        borderLeft: "1px solid rgba(139,115,85,0.15)", display: "flex", flexDirection: "column",
        background: "rgba(0,0,0,0.02)", overflowY: "auto"
      }}>
        {/* Panel tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(139,115,85,0.15)" }}>
          {[{ id: "initiative", icon: Swords, label: "Initiative" }, { id: "dice", icon: Dice6, label: "Dice" }].map(t => (
            <button key={t.id} onClick={() => setActivePanel(t.id)} style={{
              flex: 1, padding: "10px", background: activePanel === t.id ? "rgba(139,69,19,0.08)" : "transparent",
              border: "none", borderBottom: activePanel === t.id ? `2px solid ${theme.accent}` : "2px solid transparent",
              cursor: "pointer", color: activePanel === t.id ? theme.accent : theme.inkMuted,
              fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
              textTransform: "uppercase", letterSpacing: "0.5px", transition: "all 0.15s"
            }}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div style={{ padding: "16px", flex: 1 }}>
          {activePanel === "initiative" && <InitiativeTracker party={data.party} />}
          {activePanel === "dice" && <DiceRoller />}
        </div>

        {/* Active Encounter Panel */}
        <div style={{ borderTop: "1px solid rgba(139,115,85,0.15)", padding: "14px 16px" }}>
          <SectionHeader icon={Target} title="Active Encounter" />
          <div style={{ padding: "12px", background: "rgba(139,0,0,0.04)", borderRadius: "6px", borderLeft: `3px solid ${theme.danger}` }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: theme.ink, marginBottom: "4px" }}>Shadow Horror Ambush</div>
            <div style={{ fontSize: "11px", color: theme.inkMuted, marginBottom: "6px" }}>Difficulty: Hard — CR 8 + 2x CR 3</div>
            <div style={{ display: "flex", gap: "6px" }}>
              <Badge variant="danger" small>combat</Badge>
              <Badge variant="muted" small>Shadowfen</Badge>
            </div>
          </div>
        </div>

        {/* Party Status Compact */}
        <div style={{ borderTop: "1px solid rgba(139,115,85,0.15)", padding: "14px 16px" }}>
          <SectionHeader icon={Heart} title="Party Status" />
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {data.party.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: theme.ink, minWidth: "70px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name.split(" ")[0]}</span>
                <div style={{ flex: 1 }}>
                  <ProgressBar value={p.hp} max={p.maxHp} color={p.hp < p.maxHp * 0.3 ? theme.danger : p.hp < p.maxHp * 0.6 ? "#b45309" : theme.success} height={5} />
                </div>
                <span style={{ fontSize: "10px", color: theme.inkMuted, minWidth: "36px", textAlign: "right" }}>{p.hp}/{p.maxHp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────────────────

export default function CampaignManager() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const tabs = [
    { id: "dashboard", label: "Campaign Hub", icon: Compass },
    { id: "timeline", label: "Timeline", icon: Clock },
    { id: "world", label: "World", icon: Globe },
    { id: "play", label: "Play Mode", icon: Swords }
  ];

  return (
    <div style={{
      width: "100%", height: "100vh", display: "flex", flexDirection: "column",
      background: `linear-gradient(170deg, ${theme.parchment} 0%, ${theme.parchmentDark} 50%, ${theme.parchment} 100%)`,
      color: theme.ink, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      overflow: "hidden"
    }}>
      {/* Top Navigation Bar */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", height: "56px", flexShrink: 0,
        borderBottom: `1px solid ${theme.parchmentDeep}`,
        background: "rgba(245,240,225,0.95)", backdropFilter: "blur(8px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Crown size={20} color={theme.accent} />
            <span style={{ fontSize: "16px", fontWeight: 800, color: theme.ink, fontFamily: "Georgia, serif", letterSpacing: "0.5px" }}>
              Campaign Manager
            </span>
          </div>
          <div style={{ display: "flex", gap: "2px" }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: "8px 16px", background: activeTab === tab.id ? "rgba(139,69,19,0.1)" : "transparent",
                border: "none", borderRadius: "6px", cursor: "pointer",
                color: activeTab === tab.id ? theme.accent : theme.inkMuted,
                fontSize: "13px", fontWeight: activeTab === tab.id ? 700 : 500,
                display: "flex", alignItems: "center", gap: "6px", transition: "all 0.15s",
                borderBottom: activeTab === tab.id ? `2px solid ${theme.accent}` : "2px solid transparent"
              }}>
                <tab.icon size={15} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: theme.inkMuted, fontFamily: "Georgia, serif" }}>The Shattered Crown</span>
          <Bell size={16} color={theme.inkMuted} style={{ cursor: "pointer" }} />
          <Settings size={16} color={theme.inkMuted} style={{ cursor: "pointer" }} />
        </div>
      </nav>

      {/* Content Area */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <div style={{ height: "100%", overflowY: "auto" }}>
          {activeTab === "dashboard" && <DashboardView data={CAMPAIGN_DATA} onNavigate={setActiveTab} />}
          {activeTab === "timeline" && <TimelineView data={CAMPAIGN_DATA} />}
          {activeTab === "world" && <WorldView data={CAMPAIGN_DATA} />}
          {activeTab === "play" && <PlayView data={CAMPAIGN_DATA} />}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(139,115,85,0.25); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(139,115,85,0.4); }
        * { box-sizing: border-box; }
        button:hover { filter: brightness(1.05); }
        input:focus { border-color: rgba(139,69,19,0.4) !important; }
      `}</style>
    </div>
  );
}
