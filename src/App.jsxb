import { useState, useEffect, useCallback } from "react";
import { Beer, Plus, Check, Minus, Trash2, RotateCcw, AlertCircle } from "lucide-react";

const PINTS_PER_SHARE = 22;
const PRICE_PER_SHARE = 45;
const STORAGE_KEY = "keg-tracker-members";
const ROUND_KEY = "keg-tracker-round";

const COLORS = {
  stout: "#17110D",
  stoutLine: "#2E2318",
  cream: "#EDE4D0",
  creamDim: "#A99C82",
  brass: "#C09A4F",
  brassDim: "#8A6E38",
  warn: "#B8503B",
  good: "#6E8367",
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function App() {
  const [members, setMembers] = useState(null);
  const [round, setRound] = useState(1);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedRound = localStorage.getItem(ROUND_KEY);
      if (stored) {
        setMembers(JSON.parse(stored));
      } else {
        const defaults = ["Abie", "Niall", "Mark", "Richie"].map((name) => ({
          id: uid(),
          name,
          paid: false,
          pints: 0,
        }));
        setMembers(defaults);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      }
      setRound(storedRound ? JSON.parse(storedRound) : 1);
    } catch (e) {
      setMembers([]);
      setError("Could not load saved data. Starting fresh.");
    }
  }, []);

  const persist = useCallback((nextMembers) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMembers));
      setError(null);
    } catch (e) {
      setError("Save failed. Your last change may not persist.");
    }
  }, []);

  const persistRound = useCallback((nextRound) => {
    try {
      localStorage.setItem(ROUND_KEY, JSON.stringify(nextRound));
    } catch (e) {}
  }, []);

  const updateMembers = (updater) => {
    setMembers((prev) => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  };

  const addMember = () => {
    const name = newName.trim();
    if (!name) return;
    updateMembers((prev) => [...prev, { id: uid(), name, paid: false, pints: 0 }]);
    setNewName("");
  };

  const togglePaid = (id) => {
    updateMembers((prev) => prev.map((m) => (m.id === id ? { ...m, paid: !m.paid } : m)));
  };

  const adjustPints = (id, delta) => {
    updateMembers((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, pints: Math.min(PINTS_PER_SHARE, Math.max(0, m.pints + delta)) } : m
      )
    );
  };

  const removeMember = (id) => {
    updateMembers((prev) => prev.filter((m) => m.id !== id));
    setConfirmRemove(null);
  };

  const startNewRound = () => {
    updateMembers((prev) => prev.map((m) => ({ ...m, paid: false, pints: 0 })));
    setRound((r) => {
      const next = r + 1;
      persistRound(next);
      return next;
    });
    setConfirmReset(false);
  };

  if (members === null) {
    return (
      <div style={{ background: COLORS.stout, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.creamDim, fontFamily: "system-ui, sans-serif", fontSize: "14px" }}>
        Loading ledger…
      </div>
    );
  }

  const paidCount = members.filter((m) => m.paid).length;
  const totalCollected = paidCount * PRICE_PER_SHARE;
  const totalPintsLeft = members.reduce((sum, m) => sum + (PINTS_PER_SHARE - m.pints), 0);

  return (
    <div style={{ background: COLORS.stout, minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", color: COLORS.cream, padding: "0" }}>
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "28px 20px 60px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "4px" }}>
          <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "28px", fontWeight: "400", letterSpacing: "0.2px", margin: 0, color: COLORS.cream }}>
            The Snug Ledger
          </h1>
          <Beer size={22} color={COLORS.brass} strokeWidth={1.75} />
        </div>
        <p style={{ color: COLORS.creamDim, fontSize: "13px", margin: "0 0 22px", lineHeight: 1.5 }}>
          Round {round} · €{PRICE_PER_SHARE} per share · {PINTS_PER_SHARE} pints per share
        </p>

        {error && (
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", background: "rgba(184,80,59,0.12)", border: `1px solid ${COLORS.warn}`, borderRadius: "4px", padding: "10px 12px", marginBottom: "18px", fontSize: "12.5px", color: COLORS.cream }}>
            <AlertCircle size={15} color={COLORS.warn} style={{ flexShrink: 0, marginTop: "1px" }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${COLORS.stoutLine}`, borderBottom: `1px solid ${COLORS.stoutLine}`, padding: "14px 2px", marginBottom: "24px" }}>
          <div>
            <div style={{ fontSize: "11px", color: COLORS.creamDim, marginBottom: "3px" }}>Paid</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "17px", fontVariantNumeric: "tabular-nums" }}>{paidCount} / {members.length}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: COLORS.creamDim, marginBottom: "3px" }}>Collected</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "17px", fontVariantNumeric: "tabular-nums" }}>€{totalCollected}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: COLORS.creamDim, marginBottom: "3px" }}>Pints left</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: "17px", fontVariantNumeric: "tabular-nums" }}>{totalPintsLeft}</div>
          </div>
        </div>

        {members.length === 0 ? (
          <p style={{ color: COLORS.creamDim, fontSize: "13.5px", padding: "20px 2px", lineHeight: 1.6 }}>
            No one's on this keg yet. Add the first name below.
          </p>
        ) : (
          <div>
            {members.map((m) => {
              const left = PINTS_PER_SHARE - m.pints;
              const pct = (left / PINTS_PER_SHARE) * 100;
              const low = left <= 3;
              return (
                <div key={m.id} style={{ borderTop: `1px solid ${COLORS.stoutLine}`, padding: "16px 2px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "15px" }}>{m.name}</span>
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
                        <div style={{ width: `${pct}%`, height: "100%", background: low ? COLORS.warn : COLORS.brass }} />
                      </div>
                    </div>
                    <span style={{ fontSize: "12.5px", fontVariantNumeric: "tabular-nums", color: low ? COLORS.warn : COLORS.creamDim, minWidth: "62px", textAlign: "right" }}>
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

        <div style={{ marginTop: "32px", textAlign: "center" }}>
          {!confirmReset ? (
            <button onClick={() => setConfirmReset(true)} disabled={members.length === 0} style={{ background: "none", border: `1px solid ${COLORS.stoutLine}`, color: members.length === 0 ? COLORS.brassDim : COLORS.creamDim, borderRadius: "4px", padding: "9px 16px", fontSize: "12.5px", cursor: members.length === 0 ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <RotateCcw size={13} /> Start new keg round
            </button>
          ) : (
            <div style={{ fontSize: "12.5px", color: COLORS.creamDim }}>
              <p style={{ margin: "0 0 10px" }}>This resets everyone to unpaid and 0 pints for round {round + 1}.</p>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                <button onClick={startNewRound} style={{ background: COLORS.warn, color: COLORS.cream, border: "none", borderRadius: "4px", padding: "8px 14px", cursor: "pointer" }}>Confirm reset</button>
                <button onClick={() => setConfirmReset(false)} style={{ background: "none", color: COLORS.creamDim, border: `1px solid ${COLORS.stoutLine}`, borderRadius: "4px", padding: "8px 14px", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
