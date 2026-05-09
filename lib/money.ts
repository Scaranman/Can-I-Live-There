export function parseMoney(raw: string): number {
  const n = Number.parseFloat(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function formatUsd(n: number): string {
  const abs = Math.abs(n);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(abs);
  return n < 0 ? `-${formatted}` : formatted;
}

export function formatUsdSignedDelta(n: number): string {
  const base = formatUsd(Math.abs(n));
  if (n === 0) return "—";
  return `${n > 0 ? "+" : "−"}${base}`;
}
