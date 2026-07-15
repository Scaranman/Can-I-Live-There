import { marginalBracketTaxAnnual } from "../taxMath";
import type {
  CanadaProvinceBracket,
  CanadaProvinceTaxAnnualParts,
} from "./types";

export function provincialTaxAfterBpaCredit(
  taxableAnnual: number,
  brackets: CanadaProvinceBracket[],
  basicPersonalAmount: number,
  lowestRate: number,
): number {
  const taxable = Math.max(0, taxableAnnual);
  const gross = marginalBracketTaxAnnual(taxable, brackets);
  const credit = Math.max(0, basicPersonalAmount) * lowestRate;
  return Math.max(0, gross - credit);
}

/** Ontario surtax on basic Ontario tax (CRA T4032-ON TY2026 thresholds). */
export function ontarioSurtaxAnnual(basicOntTax: number): number {
  const tax = Math.max(0, basicOntTax);
  const t1 = 5818;
  const t2 = 7446;
  let surtax = 0;
  if (tax > t1) surtax += (tax - t1) * 0.2;
  if (tax > t2) surtax += (tax - t2) * 0.36;
  return surtax;
}

/** Ontario Health Premium (TY2026 schedule — statutory income bands). */
export function ontarioHealthPremiumAnnual(taxableAnnual: number): number {
  const income = Math.max(0, taxableAnnual);
  if (income <= 20_000) return 0;
  if (income <= 25_000) return (income - 20_000) * 0.06;
  if (income <= 36_000) return 300;
  if (income <= 38_500) return 300 + (income - 36_000) * 0.06;
  if (income <= 48_000) return 450;
  if (income <= 48_600) return 450 + (income - 48_000) * 0.25;
  if (income <= 72_000) return 600;
  if (income <= 72_600) return 600 + (income - 72_000) * 0.25;
  if (income <= 200_000) return 750;
  if (income <= 200_600) return 750 + (income - 200_000) * 0.25;
  return 900;
}

export function parts(
  provinceCode: string,
  provincialIncomeAnnual: number,
  qppAnnual = 0,
  qpipAnnual = 0,
  notes?: string,
): CanadaProvinceTaxAnnualParts {
  return {
    provinceCode,
    provincialIncomeAnnual: Math.max(0, provincialIncomeAnnual),
    qppAnnual: Math.max(0, qppAnnual),
    qpipAnnual: Math.max(0, qpipAnnual),
    notes,
  };
}
