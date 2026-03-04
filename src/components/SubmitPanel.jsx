import { useState } from "react";
import { MEMBER_COLORS } from "../constants";

export default function SubmitPanel({ predictions, onSubmit, members }) {
  const [selectedName, setSelectedName] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const available = members.filter(name => !predictions[name]);

  const handleSubmit = async () => {
    if (!selectedName || !price) return;
    const p = parseInt(price);
    if (isNaN(p) || p < 1 || p > 500000) return;
    setSubmitting(true);
    await onSubmit(selectedName, p);
    setSelectedName("");
    setPrice("");
    setSubmitting(false);
  };

  return (
    <div style={{
      background: "#ffffff", border: "1px solid #e0e0e8",
      borderRadius: 20, padding: 28, marginBottom: 24
    }}>
      <div style={{
        fontSize: 12, textTransform: "uppercase", letterSpacing: 2,
        color: "#888899", fontFamily: "'JetBrains Mono', monospace", marginBottom: 20
      }}>
        Submit Your Prediction
        <span style={{ fontSize: 10, color: "#f7931a", marginLeft: 8, fontWeight: 600 }}>
          Deadline: March 4, 2026 4:00 PM EST
        </span>
      </div>

      {available.length === 0 ? (
        <div style={{ color: "#999", fontSize: 14, textAlign: "center", padding: 20 }}>
          Everyone on the team has submitted their predictions!
        </div>
      ) : (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{
              display: "block", fontSize: 11, color: "#888899", textTransform: "uppercase",
              letterSpacing: 1, fontFamily: "'JetBrains Mono', monospace", marginBottom: 8
            }}>
              Team
            </label>
            <select
              value={selectedName}
              onChange={(e) => setSelectedName(e.target.value)}
              style={{
                width: "100%", background: "#f0f0f4", border: "1px solid #e0e0e8",
                borderRadius: 10, padding: "12px 14px", fontFamily: "'Outfit', sans-serif",
                fontSize: 15, color: "#1a1a2a", outline: "none", appearance: "none",
                cursor: "pointer"
              }}
            >
              <option value="">Select your name...</option>
              {available.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: "1 1 200px" }}>
            <label style={{
              display: "block", fontSize: 11, color: "#888899", textTransform: "uppercase",
              letterSpacing: 1, fontFamily: "'JetBrains Mono', monospace", marginBottom: 8
            }}>
              EOY Price Prediction (USD)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 100000"
              style={{
                width: "100%", background: "#f0f0f4", border: "1px solid #e0e0e8",
                borderRadius: 10, padding: "12px 14px", fontFamily: "'JetBrains Mono', monospace",
                fontSize: 15, color: "#1a1a2a", outline: "none"
              }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!selectedName || !price || submitting}
            style={{
              background: selectedName && price ? "#f7931a" : "#d0d0dc",
              color: selectedName && price ? "#ffffff" : "#999",
              border: "none", borderRadius: 10, padding: "12px 28px",
              fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700,
              cursor: selectedName && price ? "pointer" : "not-allowed",
              transition: "all 0.2s", whiteSpace: "nowrap",
              opacity: submitting ? 0.5 : 1
            }}
          >
            {submitting ? "Saving..." : "Lock In"}
          </button>
        </div>
      )}

      {/* Team status */}
      <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {members.map((name, i) => {
          const submitted = !!predictions[name];
          return (
            <div key={name} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: submitted ? MEMBER_COLORS[i % MEMBER_COLORS.length] + "18" : "#f0f0f4",
              border: `1px solid ${submitted ? MEMBER_COLORS[i % MEMBER_COLORS.length] + "44" : "#e0e0e8"}`,
              borderRadius: 100, padding: "5px 12px", fontSize: 12,
              color: submitted ? MEMBER_COLORS[i % MEMBER_COLORS.length] : "#888899",
              fontFamily: "'JetBrains Mono', monospace"
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: submitted ? MEMBER_COLORS[i % MEMBER_COLORS.length] : "#ccc"
              }} />
              {name}
              {submitted && <span style={{ fontSize: 10 }}>✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
