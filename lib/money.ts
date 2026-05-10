import type { MoneyCurrency } from "./types";

export function parseMoney(raw: string): number {
  const n = Number.parseFloat(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(n: number, currency: MoneyCurrency): string {
  const abs = Math.abs(n);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(abs);
  return n < 0 ? `-${formatted}` : formatted;
}

export function formatUsd(n: number): string {
  return formatMoney(n, "USD");
}

export function formatMoneySignedDelta(n: number, currency: MoneyCurrency): string {
  const base = formatMoney(Math.abs(n), currency);
  if (n === 0) return "—";
  return `${n > 0 ? "+" : "−"}${base}`;
}

export function formatUsdSignedDelta(n: number): string {
  const base = formatUsd(Math.abs(n));
  if (n === 0) return "—";
  return `${n > 0 ? "+" : "−"}${base}`;
}
