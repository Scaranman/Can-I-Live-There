/**
 * Alabama (AL) — local employee-side state wage tax estimate (TY 2026).
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

const STANDARD_DEDUCTION = { single: 3000, married: 8500, hoh: 3000 };
const PERSONAL_EXEMPTION = { single: 1500, married: 3000, hoh: 1500 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 0, to: 500, rate: 0.02 },
    { from: 500, to: 3000, rate: 0.04 },
    { from: 3000, to: null, rate: 0.05 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 0, to: 1000, rate: 0.02 },
    { from: 1000, to: 6000, rate: 0.04 },
    { from: 6000, to: null, rate: 0.05 },
];

export function estimateAlabamaStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(
    wages,
    params.filingStatus,
    STANDARD_DEDUCTION,
    PERSONAL_EXEMPTION,
  );
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("AL", income);
}
