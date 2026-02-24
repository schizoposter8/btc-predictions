export const FALLBACK_PRICE = 68890;
export const ATH = 126296;
export const YEAR_LOW = 60062;

// Contest finalization: Dec 18, 2026 at noon EST (17:00 UTC)
export const DEADLINE = new Date("2026-12-18T17:00:00Z");

// Submission cutoff: March 3, 2026 end of day (midnight UTC March 4)
export const SUBMISSION_DEADLINE = new Date("2026-03-04T00:00:00Z");

// Whitelisted team - edit this list to control who can submit
export const WHITELIST = [
  "Anthony", "Brandon", "Brock", "Chandler", "Franklyn",
  "Hervey", "Jake", "Jeff", "Josh", "Khoa",
  "Kyle", "Lisa", "Phil", "Ryan", "Steve"
];

export const MEMBER_COLORS = [
  "#f7931a", "#8b5cf6", "#3b82f6", "#00d68f", "#f43f5e",
  "#eab308", "#06b6d4", "#ec4899", "#10b981", "#6366f1",
  "#f97316", "#14b8a6", "#a855f7", "#0ea5e9", "#84cc16"
];

// Monthly BTC price data for 2026 (actual + projected path)
export const YEAR_OPEN_PRICE = 93429;
export const DEC31_CLOSE = 87502;

export const MONTHLY_PRICES = [
  { month: "Jan 1", price: DEC31_CLOSE },
  { month: "Jan", price: 92000 },
  { month: "Feb", price: 68890 },
  { month: "Mar", price: null },
  { month: "Apr", price: null },
  { month: "May", price: null },
  { month: "Jun", price: null },
  { month: "Jul", price: null },
  { month: "Aug", price: null },
  { month: "Sep", price: null },
  { month: "Oct", price: null },
  { month: "Nov", price: null },
  { month: "Dec", price: null },
];
