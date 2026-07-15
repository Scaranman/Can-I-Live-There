import { marginalBracketTaxAnnual } from "../payrollTaxApi";
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
