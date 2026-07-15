/**
 * Shared helpers for per-state employee income-tax estimates.
 * Bracket math matches PayrollTaxAPI / federal local estimators ({ from, to, rate }).
 */
import { marginalBracketTaxAnnual } from "../payrollTaxApi";
import type { FilingStatus } from "../types";
import type { StateTaxAnnualParts, StateTaxBracket, StateTaxEstimateInput } from "./types";

export function filingKey(filing: FilingStatus): "single" | "married" {
  return filing === "married" ? "married" : "single";
}

export function amountForFiling(
  map: Partial<Record<FilingStatus, number>> | undefined,
  filing: FilingStatus,
): number {
  if (!map) return 0;
  if (typeof map[filing] === "number") return map[filing]!;
  if (filing === "hoh" && typeof map.single === "number") return map.single;
  return 0;
}

/** Wages after pretax, minus state standard deduction + personal exemption (no dependents). */
export function stateTaxableIncome(
  wagesForIncomeTax: number,
  filing: FilingStatus,
  standardDeduction?: Partial<Record<FilingStatus, number>>,
  personalExemption?: Partial<Record<FilingStatus, number>>,
): number {
  const std = amountForFiling(standardDeduction, filing);
  const pe = amountForFiling(personalExemption, filing);
  return Math.max(0, wagesForIncomeTax - std - pe);
}

export function graduatedStateIncomeTax(
  taxable: number,
  brackets: StateTaxBracket[],
): number {
  return marginalBracketTaxAnnual(taxable, brackets);
}

export function flatStateIncomeTax(
  taxable: number,
  rate: number,
  floor = 0,
): number {
  const base = Math.max(0, taxable - floor);
  return base * rate;
}

export function zeroStateTax(stateCode: string, notes?: string): StateTaxAnnualParts {
  return {
    stateCode,
    stateIncomeAnnual: 0,
    stateExtrasAnnual: 0,
    notes,
  };
}

export function parts(
  stateCode: string,
  stateIncomeAnnual: number,
  stateExtrasAnnual = 0,
  notes?: string,
): StateTaxAnnualParts {
  return {
    stateCode,
    stateIncomeAnnual: Math.max(0, stateIncomeAnnual),
    stateExtrasAnnual: Math.max(0, stateExtrasAnnual),
    notes,
  };
}

export function wagesAfterPretax(params: StateTaxEstimateInput): number {
  const gross = Math.max(0, params.grossAnnual);
  const pretax = Math.min(
    gross,
    Math.max(0, params.traditional401kAnnual + params.hsaAnnual + params.fsaAnnual),
  );
  return Math.max(0, params.wagesForIncomeTax ?? gross - pretax);
}
