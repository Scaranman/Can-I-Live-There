/**
 * Oklahoma (OK) — local employee-side state wage tax estimate (TY 2026).
 * Source: Tax Foundation state individual income tax rates/brackets (https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/).
 * Not tax advice; excludes credits, local add-ons, and most phaseouts.
 */
import type { StateTaxAnnualParts, StateTaxBracket, StateTaxEstimateInput } from "./types";
import {
  filingKey,
  graduatedStateIncomeTax,
  parts,
  stateTaxableIncome,
  wagesAfterPretax,
} from "./helpers";

const STANDARD_DEDUCTION = { single: 6350, married: 12700, hoh: 6350 };
const PERSONAL_EXEMPTION = { single: 1000, married: 2000, hoh: 1000 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 3750, to: 4900, rate: 0.025 },
    { from: 4900, to: 7200, rate: 0.035 },
    { from: 7200, to: null, rate: 0.045 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 7500, to: 9800, rate: 0.025 },
    { from: 9800, to: 14400, rate: 0.035 },
    { from: 14400, to: null, rate: 0.045 },
];

export function estimateOklahomaStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(
    wages,
    params.filingStatus,
    STANDARD_DEDUCTION,
    PERSONAL_EXEMPTION,
  );
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("OK", income);
}
