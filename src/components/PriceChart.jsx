import { useState, useRef } from "react";
import { MONTHLY_PRICES, DEC31_CLOSE, ATH, MEMBER_COLORS } from "../constants";
import { formatPrice, formatK } from "../utils";

export default function PriceChart({ predictions, members, currentPrice }) {
  const svgRef = useRef(null);
  const [hoveredMember, setHoveredMember] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  const W = 820;
  const H = 520;
  const PAD = { top: 40, right: 160, bottom: 50, left: 72 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const predValues = Object.values(predictions).map(p => p.price);
  const allPrices = [
    ...MONTHLY_PRICES.filter(m => m.price).map(m => m.price),
    ...predValues,
    currentPrice, ATH * 0.3
  ];
  const minP = Math.min(...allPrices) * 0.85;
  const maxP = Math.max(...allPrices) * 1.12;

  const yScale = (price) => PAD.top + chartH - ((price - minP) / (maxP - minP)) * chartH;
  const xScale = (i) => PAD.left + (i / 12) * chartW;

  // Price grid lines
  const gridCount = 6;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const price = minP + (i / gridCount) * (maxP - minP);
    return { price, y: yScale(price) };
  });

  // Build actual price path
  const actualPrices = MONTHLY_PRICES
    .map((m, i) => (m.price ? { x: xScale(i), y: yScale(m.price), price: m.price, month: m.month } : null))
    .filter(Boolean);

  const startOfYearPrice = DEC31_CLOSE;

  // Build per-segment paths for green/red coloring
  const segments = [];
  for (let i = 0; i < actualPrices.length - 1; i++) {
    const from = actualPrices[i];
    const to = actualPrices[i + 1];
    const color = to.price >= startOfYearPrice ? "#00d68f" : "#ff4757";
    segments.push({ from, to, color });
  }

  // Determine current trend color for area fill and dots
  const latestPrice = actualPrices.length > 0 ? actualPrices[actualPrices.length - 1].price : startOfYearPrice;
  const trendColor = latestPrice >= startOfYearPrice ? "#00d68f" : "#ff4757";

  const pricePath = actualPrices.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Area under price line
  const areaPath = actualPrices.length > 0
    ? `${pricePath} L ${actualPrices[actualPrices.length - 1].x} ${yScale(minP)} L ${actualPrices[0].x} ${yScale(minP)} Z`
    : "";

  // Sort predictions by price for stacking labels
  const sortedPreds = Object.entries(predictions)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => a.price - b.price);

  // Resolve label overlaps
  const labelPositions = [];
  const LABEL_HEIGHT = 28;
  sortedPreds.forEach((pred) => {
    let y = yScale(pred.price);
    for (const existing of labelPositions) {
      if (Math.abs(y - existing) < LABEL_HEIGHT) {
        y = existing - LABEL_HEIGHT;
      }
    }
    labelPositions.push(y);
    pred.labelY = y;
  });

  // Compute current month dynamically
  const now = new Date();
  const currentMonth = now.getFullYear() === 2026
    ? Math.min(now.getMonth() + 1, 12)
    : (now.getFullYear() > 2026 ? 12 : 2);
  const nowX = xScale(currentMonth);

  return (
    <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", maxWidth: W, display: "block", margin: "0 auto" }}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={trendColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={trendColor} stopOpacity="0.01" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width={W} height={H} fill="#ffffff" rx="16" />

        {/* Grid */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={g.y} x2={PAD.left + chartW} y2={g.y}
              stroke="#e8e8f0" strokeWidth="1" />
            <text x={PAD.left - 12} y={g.y + 4} textAnchor="end"
              fill="#888899" fontSize="11" fontFamily="'JetBrains Mono', monospace">
              {formatK(Math.round(g.price))}
            </text>
          </g>
        ))}

        {/* Month labels */}
        {MONTHLY_PRICES.map((m, i) => (
          <text key={i} x={xScale(i)} y={H - 16} textAnchor="middle"
            fill={i <= currentMonth ? "#999" : "#aaa"} fontSize="11"
            fontFamily="'JetBrains Mono', monospace" fontWeight={i === currentMonth ? "600" : "400"}>
            {m.month}
          </text>
        ))}

        {/* "Now" marker line */}
        <line x1={nowX} y1={PAD.top} x2={nowX} y2={PAD.top + chartH}
          stroke="#f7931a" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
        <text x={nowX} y={PAD.top - 10} textAnchor="middle"
          fill="#f7931a" fontSize="10" fontFamily="'JetBrains Mono', monospace" opacity="0.7">
          NOW
        </text>

        {/* Future zone */}
        <rect x={nowX} y={PAD.top} width={PAD.left + chartW - nowX} height={chartH}
          fill="#f7931a" opacity="0.04" />

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}

        {/* Price line segments - colored green/red based on position vs Jan 1 */}
        {segments.map((seg, i) => (
          <line key={`seg-${i}`}
            x1={seg.from.x} y1={seg.from.y}
            x2={seg.to.x} y2={seg.to.y}
            stroke={seg.color} strokeWidth="2.5" strokeLinecap="round"
            filter="url(#glow)" />
        ))}

        {/* Start-of-year reference line */}
        <line x1={PAD.left} y1={yScale(startOfYearPrice)} x2={PAD.left + chartW} y2={yScale(startOfYearPrice)}
          stroke="#999" strokeWidth="1" strokeDasharray="2 6" opacity="0.3" />
        <text x={PAD.left + chartW - 4} y={yScale(startOfYearPrice) - 6} textAnchor="end"
          fill="#888" fontSize="9" fontFamily="'JetBrains Mono', monospace" opacity="0.5">
          Jan 1 00:00 UTC · {formatK(startOfYearPrice)}
        </text>

        {/* Price dots - colored by position vs start of year */}
        {actualPrices.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4"
            fill={p.price >= startOfYearPrice ? "#00d68f" : "#ff4757"}
            stroke="#ffffff" strokeWidth="2" />
        ))}

        {/* Current price label */}
        {actualPrices.length > 0 && (
          <g>
            <rect x={actualPrices[actualPrices.length - 1].x - 40}
              y={actualPrices[actualPrices.length - 1].y - 24}
              width="80" height="20" rx="4" fill={trendColor} />
            <text x={actualPrices[actualPrices.length - 1].x}
              y={actualPrices[actualPrices.length - 1].y - 11}
              textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700"
              fontFamily="'JetBrains Mono', monospace">
              {formatK(currentPrice)}
            </text>
          </g>
        )}

        {/* Prediction lines and labels */}
        {sortedPreds.map((pred, i) => {
          const y = yScale(pred.price);
          const colorIdx = members.indexOf(pred.name) % MEMBER_COLORS.length;
          const color = MEMBER_COLORS[colorIdx >= 0 ? colorIdx : i % MEMBER_COLORS.length];
          const isHovered = hoveredMember === pred.name;
          const opacity = hoveredMember ? (isHovered ? 1 : 0.2) : 0.7;

          return (
            <g key={pred.name}
              onMouseEnter={() => { setHoveredMember(pred.name); setTooltip(pred); }}
              onMouseLeave={() => { setHoveredMember(null); setTooltip(null); }}
              style={{ cursor: "pointer", transition: "opacity 0.2s" }}
              opacity={opacity}>
              {/* Horizontal line across chart */}
              <line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y}
                stroke={color} strokeWidth={isHovered ? 2 : 1}
                strokeDasharray={isHovered ? "none" : "3 6"} />

              {/* Diamond marker at Dec */}
              <g transform={`translate(${xScale(12)}, ${y})`}>
                <rect x="-5" y="-5" width="10" height="10" fill={color}
                  transform="rotate(45)" stroke="#ffffff" strokeWidth="1.5" />
              </g>

              {/* Name label on right side */}
              <g transform={`translate(${PAD.left + chartW + 12}, ${pred.labelY})`}>
                <rect x="0" y="-11" width="130" height="22" rx="6"
                  fill={isHovered ? color + "33" : "#ffffff"}
                  stroke={color} strokeWidth={isHovered ? 1.5 : 0.5} />
                <circle cx="12" cy="0" r="4" fill={color} />
                <text x="22" y="4" fill={color} fontSize="11" fontWeight="600"
                  fontFamily="'Outfit', sans-serif">
                  {pred.name}
                </text>
                <text x="125" y="4" textAnchor="end" fill="#999" fontSize="10"
                  fontFamily="'JetBrains Mono', monospace">
                  {formatK(pred.price)}
                </text>
              </g>
            </g>
          );
        })}

        {/* ATH reference */}
        {maxP >= ATH && (
          <g opacity="0.3">
            <line x1={PAD.left} y1={yScale(ATH)} x2={PAD.left + chartW} y2={yScale(ATH)}
              stroke="#f43f5e" strokeWidth="1" strokeDasharray="2 4" />
            <text x={PAD.left + 4} y={yScale(ATH) - 6} fill="#f43f5e" fontSize="9"
              fontFamily="'JetBrains Mono', monospace">
              ATH ${formatK(ATH)}
            </text>
          </g>
        )}
      </svg>

      {/* Hover tooltip */}
      {tooltip && (
        <div style={{
          position: "absolute", top: 8, left: 8,
          background: "#ffffffee", border: "1px solid #d0d0dc",
          borderRadius: 12, padding: "12px 16px", backdropFilter: "blur(8px)",
          zIndex: 10, minWidth: 200, color: "#1a1a2a"
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{tooltip.name}</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, color: "#f7931a", fontWeight: 700 }}>
            {formatPrice(tooltip.price)}
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 13, marginTop: 2,
            color: tooltip.price >= currentPrice ? "#00d68f" : "#ff4757"
          }}>
            {tooltip.price >= currentPrice ? "+" : ""}
            {((tooltip.price - currentPrice) / currentPrice * 100).toFixed(1)}% from today
          </div>
          {tooltip.date && (
            <div style={{ fontSize: 11, color: "#888", marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
              Submitted {tooltip.date}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
