import { MEMBER_COLORS } from "../constants";
import { formatPrice, formatK } from "../utils";

export default function Leaderboard({ predictions, members, finalPrice, currentPrice }) {
  const contestOver = finalPrice !== null;

  const sorted = Object.entries(predictions)
    .map(([name, data]) => ({
      name, ...data,
      diff: finalPrice ? Math.abs(data.price - finalPrice) : Math.abs(data.price - currentPrice),
      pctChange: ((data.price - currentPrice) / currentPrice * 100)
    }))
    .sort((a, b) => a.diff - b.diff);

  if (sorted.length === 0) return null;

  const maxPred = Math.max(...sorted.map(s => s.price));
  const minPred = Math.min(...sorted.map(s => s.price));

  return (
    <div style={{
      background: "#ffffff", border: "1px solid #e0e0e8",
      borderRadius: 20, padding: 28, marginBottom: 24
    }}>
      <div style={{
        fontSize: 12, textTransform: "uppercase", letterSpacing: 2,
        color: "#888899", fontFamily: "'JetBrains Mono', monospace", marginBottom: 20
      }}>
        {contestOver ? "Final Results" : "Prediction Leaderboard"}
      </div>

      {/* Winner banner */}
      {contestOver && sorted.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg, #f7931a15, #eab30815)", border: "2px solid #f7931a",
          borderRadius: 16, padding: "24px 20px", marginBottom: 20, textAlign: "center"
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>&#128081;</div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: "#888899", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>
            Winner
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#f7931a" }}>
            {sorted[0].name}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "#666", marginTop: 6 }}>
            Predicted {formatPrice(sorted[0].price)} — only {formatPrice(sorted[0].diff)} off!
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 13, marginTop: 12,
            background: "#ffffff", display: "inline-block", borderRadius: 8, padding: "6px 16px",
            border: "1px solid #e0e0e8"
          }}>
            Actual BTC price: <strong style={{ color: "#f7931a" }}>{formatPrice(finalPrice)}</strong>
            <span style={{ color: "#888", marginLeft: 6, fontSize: 11 }}>Dec 18, 2026 12:00 PM EST</span>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map((pred, i) => {
          const colorIdx = members.indexOf(pred.name) % MEMBER_COLORS.length;
          const color = MEMBER_COLORS[colorIdx >= 0 ? colorIdx : i % MEMBER_COLORS.length];
          const barWidth = maxPred > 0 ? (pred.price / maxPred * 100) : 0;
          const isWinner = contestOver && i === 0;

          return (
            <div key={pred.name} style={{
              position: "relative", background: isWinner ? "#fffbeb" : "#f8f8fb",
              border: `1px solid ${isWinner ? "#f7931a88" : "#e0e0e8"}`, borderRadius: 12,
              padding: "14px 16px", overflow: "hidden",
              boxShadow: isWinner ? "0 0 16px #f7931a22" : "none"
            }}>
              <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0,
                width: barWidth + "%", background: color + "20",
                borderRadius: 12, transition: "width 0.6s ease"
              }} />
              <div style={{
                position: "relative", zIndex: 1,
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
                    color: "#999", width: 24, textAlign: "center"
                  }}>
                    {i === 0 ? "\u{1F947}" : i === 1 ? "\u{1F948}" : i === 2 ? "\u{1F949}" : `#${i + 1}`}
                  </span>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%", background: color
                  }} />
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{pred.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 14,
                    fontWeight: 700, color
                  }}>
                    {formatPrice(pred.price)}
                  </span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                    color: "#999", fontWeight: 600,
                    minWidth: 72, textAlign: "right"
                  }}>
                    ±{formatPrice(pred.diff)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 20
      }}>
        {[
          { label: "Avg Prediction", value: formatK(Math.round(sorted.reduce((s, p) => s + p.price, 0) / sorted.length)), bg: "#f0f0f4", valueColor: "#f7931a" },
          { label: "Most Bullish", value: formatK(maxPred), bg: "#00d68f18", valueColor: "#00d68f" },
          { label: "Most Bearish", value: formatK(minPred), bg: "#ff475718", valueColor: "#ff4757" },
        ].map(stat => (
          <div key={stat.label} style={{
            background: stat.bg, borderRadius: 12, padding: 14, textAlign: "center"
          }}>
            <div style={{
              fontSize: 10, color: "#888899", textTransform: "uppercase",
              letterSpacing: 1, fontFamily: "'JetBrains Mono', monospace", marginBottom: 4
            }}>
              {stat.label}
            </div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 18,
              fontWeight: 700, color: stat.valueColor
            }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
