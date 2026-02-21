export const formatPrice = (p) => {
  if (p >= 1000) return "$" + p.toLocaleString("en-US");
  return "$" + p;
};

export const formatK = (p) => {
  if (p >= 1000) return "$" + (p / 1000).toFixed(0) + "K";
  return "$" + p;
};
