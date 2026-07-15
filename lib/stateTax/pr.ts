/**
 * Puerto Rico (PR) — territorial individual income tax estimate.
 * Brackets approximate Hacienda schedule for recent years (TY2025 table still used as
 * a proxy until a distinct TY2026 schedule is confirmed): 0% / 7% / 14% / 25% / 33%.
 * Not tax advice; excludes credits, optional elections, and AMT.
 */
import type { StateTaxAnnualParts, StateTaxBracket, StateTaxEstimateInput } from "./types";
import {
  graduatedStateIncomeTax,
  parts,
  stateTaxableIncome,
  wagesAfterPretax,
} from "./helpers";

const STANDARD_DEDUCTION = { single: 3500, married: 3500, hoh: 3500 };

const BRACKETS: StateTaxBracket[] = [
  { from: 0, to: 9000, rate: 0 },
  { from: 9000, to: 25000, rate: 0.07 },
  { from: 25000, to: 41500, rate: 0.14 },
  { from: 41500, to: 61500, rate: 0.25 },
  { from: 61500, to: null, rate: 0.33 },
];

export function estimatePuertoRicoStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(wages, params.filingStatus, STANDARD_DEDUCTION);
  return parts(
    "PR",
    graduatedStateIncomeTax(taxable, BRACKETS),
    0,
    "Puerto Rico local income tax (separate from US IRC). Mapped to the UI state bucket.",
  );
}
