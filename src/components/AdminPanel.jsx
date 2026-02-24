import { useState } from "react";
import { MEMBER_COLORS, WHITELIST } from "../constants";
import { formatPrice, formatK } from "../utils";
import { updateState } from "../storage";

export default function AdminPanel({
  predictions, setPredictions,
  extraMembers, setExtraMembers,
  removedMembers, setRemovedMembers,
  finalPrice, setFinalPrice,
  allMembers, adminPin: storedAdminPin
}) {
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [finalPriceInput, setFinalPriceInput] = useState("");

  const contestOver = finalPrice !== null;

  const handleAdminAuth = () => {
    if (adminPin === storedAdminPin) {
      setAdminAuthed(true);
      setAdminError("");
    } else {
      setAdminError("Wrong PIN");
      setAdminPin("");
    }
  };

  const handleSetFinalPrice = async () => {
    const p = parseInt(finalPriceInput);
    if (isNaN(p) || p < 1) return;
    setFinalPrice(p);
    await updateState({ finalPrice: p });
    setFinalPriceInput("");
  };

  const handleClearFinalPrice = async () => {
    setFinalPrice(null);
    await updateState({ finalPrice: null });
  };

  const handleResetAll = async () => {
    setPredictions({});
    setExtraMembers([]);
    setRemovedMembers([]);
    setFinalPrice(null);
    await updateState({
      predictions: {},
      extraMembers: [],
      removedMembers: [],
      finalPrice: null
    });
    setAdminOpen(false);
    setAdminAuthed(false);
    setAdminPin("");
  };

  const handleAddMember = async () => {
    const name = newMemberName.trim();
    if (!name) return;

    const updates = {};

    // If this is a previously removed whitelist member, restore them
    if (WHITELIST.includes(name) && removedMembers.includes(name)) {
      const updatedRemoved = removedMembers.filter(m => m !== name);
      setRemovedMembers(updatedRemoved);
      updates.removedMembers = updatedRemoved;
    }
    // If this is a brand new name not already on the team, add to extras
    else if (!allMembers.includes(name)) {
      const updated = [...extraMembers, name];
      setExtraMembers(updated);
      updates.extraMembers = updated;
    }
    // Name already on active team — do nothing
    else {
      return;
    }

    // Always clear any leftover prediction so they start fresh
    if (predictions[name]) {
      const updatedPreds = { ...predictions };
      delete updatedPreds[name];
      setPredictions(updatedPreds);
      updates.predictions = updatedPreds;
    }

    await updateState(updates);
    setNewMemberName("");
  };

  const handleRemoveMember = async (name) => {
    // Build all updates in one batch so removal is complete and atomic
    const updates = {};

    // Always delete the prediction — wipes from chart and leaderboard
    const updatedPreds = { ...predictions };
    if (updatedPreds[name]) {
      delete updatedPreds[name];
    }
    setPredictions(updatedPreds);
    updates.predictions = updatedPreds;

    // Remove from extra members or add to removed whitelist members
    if (extraMembers.includes(name)) {
      const updatedExtras = extraMembers.filter(m => m !== name);
      setExtraMembers(updatedExtras);
      updates.extraMembers = updatedExtras;
    }
    if (WHITELIST.includes(name)) {
      const updatedRemoved = [...removedMembers, name];
      setRemovedMembers(updatedRemoved);
      updates.removedMembers = updatedRemoved;
    }

    // Single atomic write to Firestore
    await updateState(updates);
  };

  return (
    <>
      {/* Footer with admin button */}
      <div style={{
        textAlign: "center", fontSize: 13, color: "#1a1a2a", fontWeight: 900,
        marginTop: 32, paddingTop: 20, borderTop: "1px solid #e0e0e8", lineHeight: 1.6
      }}>
        For entertainment only. Not financial advice. Predictions are shared in real time.
        <br />
        <button onClick={() => { setAdminOpen(!adminOpen); setAdminAuthed(false); setAdminPin(""); setAdminError(""); }} style={{
          background: "none", border: "1px solid #1a1a2a", borderRadius: 6,
          color: "#1a1a2a", fontSize: 13, fontWeight: 900, padding: "4px 12px", marginTop: 8,
          cursor: "pointer", fontFamily: "'JetBrains Mono', monospace"
        }}>
          Admin
        </button>
      </div>

      {/* Admin Panel */}
      {adminOpen && (
        <div style={{
          background: "#ffffff", border: "1px solid #e0e0e8",
          borderRadius: 20, padding: 28, marginTop: 16
        }}>
          <div style={{
            fontSize: 12, textTransform: "uppercase", letterSpacing: 2,
            color: "#888899", fontFamily: "'JetBrains Mono', monospace", marginBottom: 20
          }}>
            Admin Panel
          </div>

          {!adminAuthed ? (
            <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center" }}>
              <input
                type="password"
                value={adminPin}
                onChange={(e) => { setAdminPin(e.target.value); setAdminError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleAdminAuth()}
                placeholder="Enter passphrase"
                style={{
                  background: "#f0f0f4", border: `1px solid ${adminError ? "#ff4757" : "#e0e0e8"}`,
                  borderRadius: 10, padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 14, color: "#1a1a2a", outline: "none", width: 200, textAlign: "center"
                }}
              />
              <button onClick={handleAdminAuth} style={{
                background: "#f7931a", color: "#ffffff", border: "none", borderRadius: 10,
                padding: "10px 20px", fontFamily: "'Outfit', sans-serif", fontSize: 14,
                fontWeight: 700, cursor: "pointer"
              }}>
                Unlock
              </button>
              {adminError && (
                <span style={{ color: "#ff4757", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                  {adminError}
                </span>
              )}
            </div>
          ) : (
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "#00d68f18", border: "1px solid #00d68f44",
                borderRadius: 100, padding: "4px 12px", fontSize: 11,
                color: "#00d68f", fontFamily: "'JetBrains Mono', monospace", marginBottom: 20
              }}>
                Authenticated
              </div>

              {/* Finalize Contest */}
              <div style={{
                background: contestOver ? "#00d68f08" : "#f7931a08",
                border: `1px solid ${contestOver ? "#00d68f33" : "#f7931a33"}`,
                borderRadius: 14, padding: 20, marginBottom: 20
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                  Finalize Contest — auto-finalizes Dec 18, 2026 12:00 PM EST
                </div>
                {contestOver ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}>
                      Final price set: <strong style={{ color: "#f7931a" }}>{formatPrice(finalPrice)}</strong>
                    </span>
                    <button onClick={handleClearFinalPrice} style={{
                      background: "#ff475722", border: "1px solid #ff475744",
                      borderRadius: 8, padding: "6px 14px", color: "#ff4757",
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                      cursor: "pointer"
                    }}>
                      Undo Finalization
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>
                      Enter the BTC price at Dec 18, 2026 12:00 PM EST to determine the winner:
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="number"
                        value={finalPriceInput}
                        onChange={(e) => setFinalPriceInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSetFinalPrice()}
                        placeholder="e.g. 85000"
                        style={{
                          background: "#f0f0f4", border: "1px solid #e0e0e8",
                          borderRadius: 10, padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 14, color: "#1a1a2a", outline: "none", width: 180
                        }}
                      />
                      <button onClick={handleSetFinalPrice} disabled={!finalPriceInput} style={{
                        background: finalPriceInput ? "#00d68f" : "#d0d0dc",
                        color: "#ffffff", border: "none", borderRadius: 10,
                        padding: "10px 18px", fontFamily: "'Outfit', sans-serif", fontSize: 14,
                        fontWeight: 700, cursor: finalPriceInput ? "pointer" : "not-allowed"
                      }}>
                        Finalize & Name Winner
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Manage team */}
              {allMembers.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, color: "#999", marginBottom: 12 }}>
                    Manage team (click X to remove & their prediction):
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {allMembers.map((name) => {
                      const colorIdx = allMembers.indexOf(name) % MEMBER_COLORS.length;
                      const color = MEMBER_COLORS[colorIdx >= 0 ? colorIdx : 0];
                      const hasPrediction = !!predictions[name];
                      return (
                        <button key={name} onClick={() => handleRemoveMember(name)} style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          background: "#f0f0f4", border: "1px solid #d0d0dc",
                          borderRadius: 8, padding: "6px 12px", cursor: "pointer",
                          color: "#1a1a2a", fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
                          transition: "all 0.2s"
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                          {name}
                          {hasPrediction && (
                            <span style={{ color: "#999", fontSize: 10 }}>{formatK(predictions[name].price)}</span>
                          )}
                          <span style={{ color: "#ff4757", marginLeft: 4 }}>X</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add new member */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>
                  Add new team member:
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                    placeholder="Enter name..."
                    style={{
                      background: "#f0f0f4", border: "1px solid #e0e0e8",
                      borderRadius: 10, padding: "10px 14px", fontFamily: "'Outfit', sans-serif",
                      fontSize: 14, color: "#1a1a2a", outline: "none", width: 200
                    }}
                  />
                  <button onClick={handleAddMember} disabled={!newMemberName.trim()} style={{
                    background: newMemberName.trim() ? "#3b82f6" : "#d0d0dc",
                    color: "#ffffff", border: "none", borderRadius: 10,
                    padding: "10px 18px", fontFamily: "'Outfit', sans-serif", fontSize: 14,
                    fontWeight: 600, cursor: newMemberName.trim() ? "pointer" : "not-allowed"
                  }}>
                    + Add
                  </button>
                </div>
              </div>

              {/* Reset all */}
              <button onClick={handleResetAll} style={{
                background: "#ff475722", border: "1px solid #ff475744",
                borderRadius: 10, padding: "10px 24px", color: "#ff4757",
                fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 600,
                cursor: "pointer", transition: "all 0.2s"
              }}>
                Reset All Predictions
              </button>
              <span style={{ fontSize: 11, color: "#999", marginLeft: 12 }}>
                This cannot be undone
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
