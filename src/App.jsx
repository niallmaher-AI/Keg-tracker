import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Check, Minus, Trash2, RotateCcw, AlertCircle, ChevronDown, ChevronUp, User } from "lucide-react";
import { supabase } from "./supabaseClient";

const PINTS_PER_SHARE = 22;
const PRICE_PER_SHARE = 45;
const ROW_ID = 1;
const MAX_LOG_ENTRIES = 100;
const MAX_ROUND_HISTORY = 30;
const DEVICE_USER_KEY = "keg-tracker-device-user";
const AVATAR_COLORS = ["#C09A4F", "#B8503B", "#6E8367", "#8FA6C2", "#C97BA0", "#D9A441", "#7C9473", "#A8763E"];

const COLORS = {
  stout: "#000000",
  stoutLine: "#2A2A2A",
  cream: "#F5EFE0",
  creamDim: "#B8AD94",
  brass: "#C09A4F",
  brassDim: "#8A6E38",
  warn: "#B8503B",
  good: "#6E8367",
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function formatTimestamp(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Green (full) -> yellow -> orange -> red (empty), smooth hue interpolation.
function barColor(left, total) {
  const pct = Math.max(0, Math.min(1, left / total));
  const hue = Math.round(120 * pct);
  return `hsl(${hue}, 62%, 48%)`;
}

function KegIcon({ size = 24, color = COLORS.brass }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10.5" y="1.2" width="3" height="1.8" rx="0.4" fill={color} />
      <path
        d="M9 3H15V4.6C17.4 5.7 19 8.6 19 12C19 15.4 17.4 18.3 15 19.4V21H9V19.4C6.6 18.3 5 15.4 5 12C5 8.6 6.6 5.7 9 4.6V3Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line x1="5.6" y1="8.8" x2="18.4" y2="8.8" stroke={color} strokeWidth="1.1" opacity="0.85" />
      <line x1="5.2" y1="15.2" x2="18.8" y2="15.2" stroke={color} strokeWidth="1.1" opacity="0.85" />
    </svg>
  );
}

// Small pint-of-stout glyph: dark glass, cream foam band, colored rim accent.
function PintAvatar({ size = 16, accent = COLORS.brass }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7.6 3H16.4L15.3 20.5C15.25 21 14.9 21.4 14.4 21.4H9.6C9.1 21.4 8.75 21 8.7 20.5L7.6 3Z"
        fill="#231409"
        stroke={accent}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M7.85 6.6H16.15L15.9 9.6H8.1L7.85 6.6Z" fill="#F0E8D4" />
    </svg>
  );
}

function IdentityPicker({ suggestedNames, onPick }) {
  const [customName, setCustomName] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: COLORS.stout, zIndex: 500, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <KegIcon size={40} color={COLORS.brass} />
      <h2 style={{ color: COLORS.cream, fontFamily: "Georgia, serif", fontWeight: 400, fontSize: "22px", margin: "16px 0 6px" }}>Who's this?</h2>
      <p style={{ color: COLORS.creamDim, fontSize: "13px", margin: "0 0 24px", textAlign: "center" }}>Saved on this device only — used to label the activity log.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", maxWidth: "300px" }}>
        {suggestedNames.map((name) => (
          <button key={name} onClick={() => onPick(name)} style={{ background: "none", border: `1px solid ${COLORS.brassDim}`, color: COLORS.cream, borderRadius: "6px", padding: "12px", fontSize: "15px", cursor: "pointer" }}>
            {name}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px", marginTop: "18px", width: "100%", maxWidth: "300px" }}>
        <input value={customName} onChange={(e) => setCustomName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && customName.trim() && onPick(customName.trim())} placeholder="Someone else..." style={{ flex: 1, background: "transparent", border: `1px solid ${COLORS.stoutLine}`, borderRadius: "4px", color: COLORS.cream, padding: "10px 12px", fontSize: "14px", outline: "none" }} />
        <button onClick={() => customName.trim() && onPick(customName.trim())} style={{ background: COLORS.brass, color: COLORS.stout, border: "none", borderRadius: "4px", padding: "0 16px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>Go</button>
      </div>
    </div>
  );
}

function AvatarPicker({ current, onPick, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#0d0d0d", border: `1px solid ${COLORS.stoutLine}`, borderRadius: "10px", padding: "18px", maxWidth: "320px", width: "100%" }}>
        <p style={{ color: COLORS.creamDim, fontSize: "12.5px", margin: "0 0 12px" }}>Pick a pint color</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
          {AVATAR_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onPick(color)}
              style={{
                padding: "12px 0",
                background: current === color ? "rgba(192,154,79,0.15)" : "transparent",
                border: `1px solid ${current === color ? color : COLORS.stoutLine}`,
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PintAvatar size={26} accent={color} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [members, setMembers] = useState(null);
  const [round, setRound] = useState(1);
  const [log, setLog] = useState([]);
  const [roundHistory, setRoundHistory] = useState([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [showLog, setShowLog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [deviceUser, setDeviceUser] = useState(undefined);
  const [avatarPickerFor, setAvatarPickerFor] = useState(null);
  const skipNextSync = useRef(false);
  const roundRef = useRef(1);

  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  useEffect(() => {
    const stored = window.localStorage.getItem(DEVICE_USER_KEY);
    setDeviceUser(stored || null);
  }, []);

  const pickDeviceUser = (name) => {
    window.localStorage.setItem(DEVICE_USER_KEY, name);
    setDeviceUser(name);
  };

  const switchDeviceUser = () => {
    window.localStorage.removeItem(DEVICE_USER_KEY);
    setDeviceUser(null);
  };

  const loadData = useCallback(async () => {
    const { data, error: fetchError } = await supabase.from("keg_data").select("data").eq("id", ROW_ID).single();

    if (fetchError) {
      setError("Could not load shared data. Check your connection.");
      setMembers([]);
      return;
    }

    const payload = data?.data || { members: [], round: 1, log: [], roundHistory: [] };

    if (!payload.members || payload.members.length === 0) {
      const defaults = ["Abie", "Niall", "Mark", "Richie"].map((name, i) => ({
        id: uid(),
        name,
        paid: false,
        pints: 0,
        avatar: AVATAR_COLORS[i % AVATAR_COLORS.length],
      }));
      const seeded = { members: defaults, round: 1, log: [], roundHistory: [] };
      await supabase.from("keg_data").update({ data: seeded }).eq("id", ROW_ID);
      setMembers(defaults);
      setRound(1);
      setLog([]);
      setRoundHistory([]);
    } else {
      setMembers(payload.members);
      setRound(payload.round || 1);
      setLog(payload.log || []);
      setRoundHistory(payload.roundHistory || []);
    }
    setError(null);
  }, []);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel("keg_data_changes")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "keg_data" }, (payload) => {
        if (skipNextSync.current) {
          skipNextSync.current = false;
          return;
        }
        const newData = payload.new?.data;
        if (newData) {
          setMembers(newData.members || []);
          setRound(newData.round || 1);
          setLog(newData.log || []);
          setRoundHistory(newData.roundHistory || []);
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [loadData]);

  const persist = useCallback(async (nextMembers, nextRound, nextLog, nextRoundHistory) => {
    skipNextSync.current = true;
    const { error: saveError } = await supabase
      .from("keg_data")
      .update({ data: { members: nextMembers, round: nextRound, log: nextLog, roundHistory: nextRoundHistory } })
      .eq("id", ROW_ID);
    setError(saveError ? "Save failed. Your last change may not have synced." : null);
  }, []);

  const applyChange = (memberUpdater, describe) => {
    setMembers((prevMembers) => {
      const nextMembers = memberUpdater(prevMembers);
      const baseText = describe(nextMembers, prevMembers);
      const text = baseText ? `${baseText} — by ${deviceUser || "someone"}` : null;
      setLog((prevLog) => {
        const nextLog = text ? [{ id: uid(), ts: new Date().toISOString(), text }, ...prevLog].slice(0, MAX_LOG_ENTRIES) : prevLog;
        persist(nextMembers, roundRef.current, nextLog, roundHistory);
        return nextLog;
      });
      return nextMembers;
    });
  };

  const addMember = () => {
    const name = newName.trim();
    if (!name) return;
    applyChange(
      (prev) => [...prev, { id: uid(), name, paid: false, pints: 0, avatar: AVATAR_COLORS[prev.length % AVATAR_COLORS.length] }],
      () => `${name} added to the keg`
    );
    setNewName("");
  };

  const togglePaid = (id) => {
    applyChange(
      (prev) => prev.map((m) => (m.id === id ? { ...m, paid: !m.paid } : m)),
      (nextMembers) => {
        const m = nextMembers.find((x) => x.id === id);
        return `${m.name} marked ${m.paid ? "Paid" : "Unpaid"}`;
      }
    );
  };

  const adjustPints = (id, delta) => {
    applyChange(
      (prev) => prev.map((m) => (m.id === id ? { ...m, pints: Math.min(PINTS_PER_SHARE, Math.max(0, m.pints + delta)) } : m)),
      (nextMembers, prevMembers) => {
        const nm = nextMembers.find((x) => x.id === id);
        const pm = prevMembers.find((x) => x.id === id);
        if (nm.pints === pm.pints) return null;
        const actualDelta = nm.pints - pm.pints;
        return `${nm.name} ${actualDelta > 0 ? "logged a pint" : "undid a pint"} (${nm.pints}/${PINTS_PER_SHARE})`;
      }
    );
  };

  const setAvatar = (id, color) => {
    applyChange(
      (prev) => prev.map((m) => (m.id === id ? { ...m, avatar: color } : m)),
      (nextMembers) => {
        const m = nextMembers.find((x) => x.id === id);
        return `${m.name} changed avatar`;
      }
    );
    setAvatarPickerFor(null);
  };

  const removeMember = (id) => {
    const target = members.find((m) => m.id === id);
    applyChange(
      (prev) => prev.filter((m) => m.id !== id),
      () => (target ? `${target.name} removed` : null)
    );
    setConfirmRemove(null);
  };

  const startNewRound = () => {
    const nextRound = round + 1;
    const snapshot = {
      roundNumber: round,
      endedAt: new Date().toISOString(),
      members: members.map((m) => ({ name: m.name, paid: m.paid, pints: m.pints, avatar: m.avatar })),
    };
    const nextRoundHistory = [snapshot, ...roundHistory].slice(0, MAX_ROUND_HISTORY);

    setMembers((prevMembers) => {
      const resetMembers = prevMembers.map((m) => ({ ...m, paid: false, pints: 0 }));
      const logText = `Started round ${nextRound} — by ${deviceUser || "someone"}`;
      setLog((prevLog) => {
        const nextLog = [{ id: uid(), ts: new Date().toISOString(), text: logText }, ...prevLog].slice(0, MAX_LOG_ENTRIES);
        persist(resetMembers, nextRound, nextLog, nextRoundHistory);
        return nextLog;
      });
      return resetMembers;
    });

    setRoundHistory(nextRoundHistory);
    setRound(nextRound);
    setConfirmReset(false);
  };

  if (deviceUser === undefined || members === null) {
    return (
      <div style={{ background: COLORS.stout, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.creamDim, fontFamily: "system-ui, sans-serif", fontSize: "14px" }}>
        Loading ledger…
      </div>
    );
  }

  if (deviceUser === null) {
    const names = members.length > 0 ? members.map((m) => m.name) : ["Abie", "Niall", "Mark", "Richie"];
    return <IdentityPicker suggestedNames={names} onPick={pickDeviceUser} />;
  }

  const paidCount = members.filter((m) => m.paid).length;
  const totalCollected = paidCount * PRICE_PER_SHARE;
  const totalPintsLeft = members.reduce((sum, m) => sum + (PINTS_PER_SHARE - m.pints), 0);

  return (
    <div style={{ background: COLORS.stout, minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", color: COLORS.cream, padding: "0" }}>
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "calc(28px + env(safe-area-inset-top)) 20px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "27px", fontWeight: "400", letterSpacing: "0.2px", margin: 0, color: COLORS.cream }}>
            Dads Keg Tracker
          </h1>
          <KegIcon size={26} color={COLORS.brass} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "22px" }}>
          <p style={{ color: COLORS.creamDim, fontSize: "13px", margin: 0, lineHeight: 1.5 }}>
            Round {round} · €{PRICE_PER_SHARE} per share · {PINTS_PER_SHARE} pints per share
          </p>
          <button onClick={switchDeviceUser} style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", color: COLORS.creamDim, fontSize: "11.5px", cursor: "pointer", padding: "2px", whiteSpace: "nowrap" }}>
            <User size={11} /> {deviceUser}
          </button>
        </div>

        {error && (
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", background: "rgba(184,80,59,0.12)", border: `1px solid ${COLORS.warn}`, borderRadius: "4px", padding: "10px 12px", marginBottom: "18px", fontSize: "12.5px", color: COLORS.cream }}>
            <AlertCircle size={15} color={COLORS.warn} style={{ flexShrink: 0, marginTop: "1px" }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${COLORS.stoutLine}`, borderBottom: `1px solid ${COLORS.stoutLine}`, padding: "14px 2px", marginBottom: "24px" }}>
          <div>
            <div style={{ fontSize: "11px", color: COLORS.creamDim, marginBottom: "3px" }}>Paid</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "17px", fontVariantNumeric: "tabular-nums", color: COLORS.cream }}>{paidCount} / {members.length}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: COLORS.creamDim, marginBottom: "3px" }}>Collected</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "17px", fontVariantNumeric: "tabular-nums", color: COLORS.cream }}>€{totalCollected}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: COLORS.creamDim, marginBottom: "3px" }}>Pints left</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "17px", fontVariantNumeric: "tabular-nums", color: COLORS.cream }}>{totalPintsLeft}</div>
          </div>
        </div>

        {members.length === 0 ? (
          <p style={{ color: COLORS.creamDim, fontSize: "13.5px", padding: "20px 2px", lineHeight: 1.6 }}>No one's on this keg yet. Add the first name below.</p>
        ) : (
          <div>
            {members.map((m) => {
              const left = PINTS_PER_SHARE - m.pints;
              const pct = (left / PINTS_PER_SHARE) * 100;
              const fillColor = barColor(left, PINTS_PER_SHARE);
              return (
                <div key={m.id} style={{ borderTop: `1px solid ${COLORS.stoutLine}`, padding: "16px 2px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button
                        onClick={() => setAvatarPickerFor(m.id)}
                        style={{ background: "rgba(192,154,79,0.1)", border: `1px solid ${COLORS.stoutLine}`, borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                        aria-label={`Change ${m.name}'s avatar`}
                      >
                        <PintAvatar size={17} accent={m.avatar || COLORS.brass} />
                      </button>
                      <span style={{ fontSize: "15px", color: COLORS.cream }}>{m.name}</span>
                      <button onClick={() => togglePaid(m.id)} style={{ display: "flex", alignItems: "center", gap: "4px", background: m.paid ? "rgba(110,131,103,0.18)" : "transparent", border: `1px solid ${m.paid ? COLORS.good : COLORS.brassDim}`, borderRadius: "3px", color: m.paid ? COLORS.good : COLORS.creamDim, fontSize: "11px", padding: "3px 8px", cursor: "pointer" }}>
                        {m.paid && <Check size={11} strokeWidth={2.5} />}
                        {m.paid ? "Paid" : "Unpaid"}
                      </button>
                    </div>
                    <button onClick={() => setConfirmRemove(confirmRemove === m.id ? null : m.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: COLORS.creamDim }} aria-label={`Remove ${m.name}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {confirmRemove === m.id && (
                    <div style={{ display: "flex", gap: "8px", marginBottom: "10px", fontSize: "12px" }}>
                      <span style={{ color: COLORS.creamDim, alignSelf: "center" }}>Remove {m.name}?</span>
                      <button onClick={() => removeMember(m.id)} style={{ background: COLORS.warn, color: COLORS.cream, border: "none", borderRadius: "3px", padding: "4px 10px", cursor: "pointer" }}>Confirm</button>
                      <button onClick={() => setConfirmRemove(null)} style={{ background: "none", color: COLORS.creamDim, border: `1px solid ${COLORS.stoutLine}`, borderRadius: "3px", padding: "4px 10px", cursor: "pointer" }}>Cancel</button>
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: "5px", background: COLORS.stoutLine, borderRadius: "3px", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: fillColor, transition: "background 0.3s ease" }} />
                      </div>
                    </div>
                    <span style={{ fontSize: "12.5px", fontVariantNumeric: "tabular-nums", color: left <= 3 ? COLORS.warn : COLORS.creamDim, minWidth: "62px", textAlign: "right" }}>
                      {left} / {PINTS_PER_SHARE} left
                    </span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button onClick={() => adjustPints(m.id, -1)} disabled={m.pints === 0} style={{ width: "26px", height: "26px", borderRadius: "3px", border: `1px solid ${COLORS.stoutLine}`, background: "transparent", color: m.pints === 0 ? COLORS.brassDim : COLORS.cream, cursor: m.pints === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Undo a pint">
                        <Minus size={13} />
                      </button>
                      <button onClick={() => adjustPints(m.id, 1)} disabled={left === 0} style={{ width: "26px", height: "26px", borderRadius: "3px", border: `1px solid ${COLORS.brass}`, background: left === 0 ? "transparent" : "rgba(192,154,79,0.15)", color: left === 0 ? COLORS.brassDim : COLORS.brass, cursor: left === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Log a pint">
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", marginTop: "20px", borderTop: `1px solid ${COLORS.stoutLine}`, paddingTop: "20px" }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMember()} placeholder="Add a name" style={{ flex: 1, background: "transparent", border: `1px solid ${COLORS.stoutLine}`, borderRadius: "4px", color: COLORS.cream, padding: "9px 12px", fontSize: "14px", outline: "none" }} />
          <button onClick={addMember} style={{ background: COLORS.brass, color: COLORS.stout, border: "none", borderRadius: "4px", padding: "0 16px", fontSize: "13px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
            <Plus size={14} strokeWidth={2.5} /> Add
          </button>
        </div>

        <div style={{ marginTop: "24px", borderTop: `1px solid ${COLORS.stoutLine}`, paddingTop: "16px" }}>
          <button onClick={() => setShowLog((s) => !s)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", color: COLORS.creamDim, fontSize: "13px", cursor: "pointer", padding: "4px 2px" }}>
            <span>Activity log{log.length > 0 ? ` (${log.length})` : ""}</span>
            {showLog ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showLog && (
            <div style={{ marginTop: "10px" }}>
              {log.length === 0 ? (
                <p style={{ color: COLORS.creamDim, fontSize: "12.5px", padding: "8px 2px" }}>No activity yet.</p>
              ) : (
                log.map((entry) => (
                  <div key={entry.id} style={{ display: "flex", justifyContent: "space-between", gap: "10px", padding: "6px 2px", fontSize: "12.5px", borderTop: `1px solid ${COLORS.stoutLine}` }}>
                    <span style={{ color: COLORS.cream }}>{entry.text}</span>
                    <span style={{ color: COLORS.creamDim, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{formatTimestamp(entry.ts)}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div style={{ marginTop: "14px", borderTop: `1px solid ${COLORS.stoutLine}`, paddingTop: "16px" }}>
          <button onClick={() => setShowHistory((s) => !s)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", color: COLORS.creamDim, fontSize: "13px", cursor: "pointer", padding: "4px 2px" }}>
            <span>Round history{roundHistory.length > 0 ? ` (${roundHistory.length})` : ""}</span>
            {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showHistory && (
            <div style={{ marginTop: "10px" }}>
              {roundHistory.length === 0 ? (
                <p style={{ color: COLORS.creamDim, fontSize: "12.5px", padding: "8px 2px" }}>No completed rounds yet.</p>
              ) : (
                roundHistory.map((r) => {
                  const collected = r.members.filter((m) => m.paid).length * PRICE_PER_SHARE;
                  return (
                    <div key={r.roundNumber + r.endedAt} style={{ borderTop: `1px solid ${COLORS.stoutLine}`, padding: "10px 2px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ color: COLORS.cream, fontSize: "13px", fontFamily: "Georgia, serif" }}>Round {r.roundNumber}</span>
                        <span style={{ color: COLORS.creamDim, fontSize: "11.5px" }}>{formatDate(r.endedAt)} · €{collected}</span>
                      </div>
                      {r.members.map((m, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", color: COLORS.creamDim, padding: "2px 0" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: m.avatar || COLORS.brass, display: "inline-block" }} />
                            {m.name}
                          </span>
                          <span style={{ fontVariantNumeric: "tabular-nums" }}>{m.pints}/{PINTS_PER_SHARE} pints · {m.paid ? "Paid" : "Unpaid"}</span>
                        </div>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div style={{ marginTop: "32px", textAlign: "center" }}>
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)} disabled={members.length === 0} style={{ background: "none", border: `1px solid ${COLORS.stoutLine}`, color: members.length === 0 ? COLORS.brassDim : COLORS.creamDim, borderRadius: "4px", padding: "9px 16px", fontSize: "12.5px", cursor: members.length === 0 ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <RotateCcw size={13} /> Start new keg round
            </button>
          ) : (
            <div style={{ fontSize: "12.5px", color: COLORS.creamDim }}>
              <p style={{ margin: "0 0 10px" }}>This archives round {round} and resets everyone to unpaid and 0 pints for round {round + 1}.</p>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                <button onClick={startNewRound} style={{ background: COLORS.warn, color: COLORS.cream, border: "none", borderRadius: "4px", padding: "8px 14px", cursor: "pointer" }}>Confirm reset</button>
                <button onClick={() => setConfirmReset(false)} style={{ background: "none", color: COLORS.creamDim, border: `1px solid ${COLORS.stoutLine}`, borderRadius: "4px", padding: "8px 14px", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {avatarPickerFor && (
        <AvatarPicker
          current={members.find((m) => m.id === avatarPickerFor)?.avatar}
          onPick={(color) => setAvatar(avatarPickerFor, color)}
          onClose={() => setAvatarPickerFor(null)}
        />
      )}
    </div>
  );
}
