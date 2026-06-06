import { useState, useEffect, useCallback } from "react";
import { FALLBACK_PRICE, ATH, YEAR_LOW, DEADLINE, SUBMISSION_DEADLINE, WHITELIST, MONTHLY_PRICES } from "./constants";
import { formatPrice } from "./utils";
import { subscribeToState, updateState } from "./storage";
import PriceChart from "./components/PriceChart";
import SubmitPanel from "./components/SubmitPanel";
import Leaderboard from "./components/Leaderboard";
import AdminPanel from "./components/AdminPanel";

// Returns the last day of a given month (0-indexed) in 2026
function getLastDayOfMonth(monthIndex) {
  // monthIndex: 0=Jan, 1=Feb, ... 11=Dec
  // new Date(year, month+1, 0) gives last day of that month
  return new Date(2026, monthIndex + 1, 0).getDate();
}

// Fetch BTC closing price for a specific date from CoinGecko
async function fetchHistoricalPrice(day, month, year) {
  try {
    const dd = String(day).padStart(2, "0");
    const mm = String(month).padStart(2, "0");
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/bitcoin/history?date=${dd}-${mm}-${year}&localization=false`
    );
    const data = await res.json();
    if (data?.market_data?.current_price?.usd) {
      return Math.round(data.market_data.current_price.usd);
    }
  } catch (e) {
    // Silently fail
  }
  return null;
}

export default function App() {
  const [predictions, setPredictions] = useState({});
  const [extraMembers, setExtraMembers] = useState([]);
  const [removedMembers, setRemovedMembers] = useState([]);
  const [finalPrice, setFinalPrice] = useState(null);
  const [adminPin, setAdminPin] = useState("beach bagel");
  const [storedMonthlyPrices, setStoredMonthlyPrices] = useState({});
  const [currentPrice, setCurrentPrice] = useState(FALLBACK_PRICE);
  const [yearLow, setYearLow] = useState(YEAR_LOW);
  const [priceLoading, setPriceLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState("");

  const allMembers = [...WHITELIST.filter(n => !removedMembers.includes(n)), ...extraMembers];
  const contestOver = finalPrice !== null;
  const submissionsClosed = new Date() >= SUBMISSION_DEADLINE || contestOver;

  // Build merged monthly prices: hardcoded values + Firestore-stored historical prices
  const mergedMonthlyPrices = MONTHLY_PRICES.map((m, i) => {
    if (m.price !== null) return m;
    // MONTHLY_PRICES indices: 0=Jan1, 1=Jan, 2=Feb, 3=Mar, ... 12=Dec
    // So index 3 = Mar (month 3 in calendar), stored key would be "2026-03"
    if (i >= 1 && i <= 12) {
      const key = `2026-${String(i).padStart(2, "0")}`;
      if (storedMonthlyPrices[key]) {
        return { ...m, price: storedMonthlyPrices[key] };
      }
    }
    return m;
  });

  // Subscribe to Firestore for real-time sync across all visitors
  useEffect(() => {
    const unsubscribe = subscribeToState((data) => {
      setPredictions(data.predictions || {});
      setExtraMembers(data.extraMembers || []);
      setRemovedMembers(data.removedMembers || []);
      setFinalPrice(data.finalPrice ?? null);
      setAdminPin(data.adminPin || "beach bagel");
      setStoredMonthlyPrices(data.monthlyPrices || {});
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Auto-fetch historical closing prices for completed months
  useEffect(() => {
    if (loading) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed: 0=Jan

    // Only relevant for 2026 or later
    if (currentYear < 2026) return;

    // Determine which months are completed
    // If it's 2026, months 0..currentMonth-1 are completed
    // If it's 2027+, all 12 months are completed
    const completedMonths = currentYear > 2026 ? 12 : currentMonth; // e.g. April (3) means Jan(0), Feb(1), Mar(2) done

    const missing = [];
    for (let m = 0; m < completedMonths; m++) {
      const key = `2026-${String(m + 1).padStart(2, "0")}`; // "2026-01" for Jan
      const monthlyIndex = m + 1; // MONTHLY_PRICES index: 1=Jan, 2=Feb, ...
      // Skip if hardcoded or already stored
      if (MONTHLY_PRICES[monthlyIndex]?.price !== null) continue;
      if (storedMonthlyPrices[key]) continue;
      missing.push({ key, monthIndex: m });
    }

    if (missing.length === 0) return;

    // Fetch all missing prices
    (async () => {
      const updates = {};
      for (const { key, monthIndex } of missing) {
        const lastDay = getLastDayOfMonth(monthIndex);
        const price = await fetchHistoricalPrice(lastDay, monthIndex + 1, 2026);
        if (price) {
          updates[key] = price;
        }
      }
      if (Object.keys(updates).length > 0) {
        const merged = { ...storedMonthlyPrices, ...updates };
        setStoredMonthlyPrices(merged);
        await updateState({ monthlyPrices: merged });
      }
    })();
  }, [loading, storedMonthlyPrices]);

  // Fetch live BTC price from CoinGecko (free, no API key needed)
  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
      );
      const data = await res.json();
      if (data.bitcoin && data.bitcoin.usd) {
        setCurrentPrice(Math.round(data.bitcoin.usd));
        setLastUpdated(new Date());
      }
    } catch (e) {
      // Keep using fallback or last known price
    } finally {
      setPriceLoading(false);
    }

    // Fetch 2026 year low from CoinGecko market chart range
    try {
      const jan1 = Math.floor(new Date("2026-01-01T00:00:00Z").getTime() / 1000);
      const now = Math.floor(Date.now() / 1000);
      const rangeRes = await fetch(
        `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${jan1}&to=${now}`
      );
      const rangeData = await rangeRes.json();
      if (rangeData?.prices?.length) {
        const low = Math.round(Math.min(...rangeData.prices.map(p => p[1])));
        if (low > 0) setYearLow(low);
      }
    } catch (e) {
      // Keep using fallback year low
    }
  }, []);

  // Fetch price on load and every 10 minutes
  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 600000);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  // Countdown timer to contest end
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const diff = DEADLINE - now;
      if (diff <= 0) {
        setCountdown("FINALIZING...");
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hrs = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${days}d ${hrs}h ${mins}m ${secs}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-finalize: when past deadline and no final price set, lock in the current BTC price
  useEffect(() => {
    if (loading || finalPrice !== null || priceLoading) return;
    const now = new Date();
    if (now < DEADLINE) return;
    if (currentPrice && currentPrice !== FALLBACK_PRICE) {
      setFinalPrice(currentPrice);
      updateState({ finalPrice: currentPrice });
    }
  }, [loading, finalPrice, priceLoading, currentPrice]);

  const handleSubmit = useCallback(async (name, price) => {
    const updated = {
      ...predictions,
      [name]: {
        price,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      }
    };
    setPredictions(updated);
    await updateState({ predictions: updated });
  }, [predictions]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#d6ecf2", display: "flex",
        alignItems: "center", justifyContent: "center", color: "#f7931a",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 16
      }}>
        Loading predictions...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#d6ecf2", color: "#1a1a2a",
      fontFamily: "'Outfit', sans-serif"
    }}>
      {/* Background effects */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(140,195,215,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(140,195,215,0.7) 1px, transparent 1px)",
        backgroundSize: "60px 60px"
      }} />
      <div style={{
        position: "fixed", top: -200, right: -200, width: 600, height: 600,
        borderRadius: "50%", background: "#f7931a", filter: "blur(150px)",
        opacity: 0.06, pointerEvents: "none"
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 920, margin: "0 auto", padding: "40px 20px 80px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{
            fontSize: "clamp(1.8rem, 5vw, 2.8rem)", fontWeight: 900,
            letterSpacing: -1.5, lineHeight: 1.1, margin: 0
          }}>
            <span style={{ color: "#f7931a" }}>&#8383;</span>itcoin 2026 EOY Predictions
          </h1>
          <div style={{
            marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8,
            background: contestOver ? "#00d68f18" : "#ffffff",
            border: `1px solid ${contestOver ? "#00d68f44" : "#e0e0e8"}`,
            borderRadius: 10, padding: "8px 16px",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12
          }}>
            {contestOver ? (
              <span style={{ color: "#00d68f", fontWeight: 600 }}>CONTEST FINALIZED</span>
            ) : (
              <>
                <span style={{ color: "#888899" }}>Dec 18, 2026 12:00 PM EST</span>
                <span style={{ color: "#f7931a", fontWeight: 700 }}>{countdown}</span>
              </>
            )}
          </div>
        </div>

        {/* Current price strip */}
        <div style={{
          background: "#ffffff", border: "1px solid #e0e0e8", borderRadius: 16,
          padding: "16px 28px", marginBottom: 28
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 28,
            flexWrap: "wrap"
          }}>
            {[
              { label: "Current Price", value: priceLoading ? "Loading..." : formatPrice(currentPrice), color: "#f7931a" },
              { label: "All-Time High", value: formatPrice(ATH), color: "#1a1a2a" },
              { label: "2026 Low", value: formatPrice(yearLow), color: "#ff4757" },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: 10, color: "#888899", textTransform: "uppercase",
                  letterSpacing: 1.5, fontFamily: "'JetBrains Mono', monospace", marginBottom: 3,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6
                }}>
                  {i === 0 && !priceLoading && (
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%", background: "#00d68f",
                      display: "inline-block", animation: "pulse 2s infinite"
                    }} />
                  )}
                  {item.label}
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 19,
                  fontWeight: 700, color: item.color
                }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          {lastUpdated && (
            <div style={{
              textAlign: "center", marginTop: 8, fontSize: 10, color: "#aaa",
              fontFamily: "'JetBrains Mono', monospace"
            }}>
              Live · updates every 10 min · last updated {lastUpdated.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York" })} EST
            </div>
          )}
        </div>

        {/* Chart */}
        <div style={{
          background: "#ffffff", border: "1px solid #e0e0e8",
          borderRadius: 20, padding: "24px 16px", marginBottom: 24
        }}>
          <div style={{
            fontSize: 12, textTransform: "uppercase", letterSpacing: 2,
            color: "#888899", fontFamily: "'JetBrains Mono', monospace",
            marginBottom: 16, paddingLeft: 12
          }}>
            2026 Price Chart + Team Predictions
          </div>
          <PriceChart predictions={predictions} members={allMembers} currentPrice={currentPrice} monthlyPrices={mergedMonthlyPrices} />
        </div>

        {/* Submit */}
        {!submissionsClosed && (
          <SubmitPanel predictions={predictions} onSubmit={handleSubmit} members={allMembers} />
        )}

        {/* Leaderboard */}
        <Leaderboard predictions={predictions} members={allMembers} finalPrice={finalPrice} currentPrice={currentPrice} />

        {/* Admin */}
        <AdminPanel
          predictions={predictions} setPredictions={setPredictions}
          extraMembers={extraMembers} setExtraMembers={setExtraMembers}
          removedMembers={removedMembers} setRemovedMembers={setRemovedMembers}
          finalPrice={finalPrice} setFinalPrice={setFinalPrice}
          allMembers={allMembers} adminPin={adminPin}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
