/**
 * Virginia (VA) — local employee-side state wage tax estimate (TY 2026).
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

const STANDARD_DEDUCTION = { single: 8750, married: 17500, hoh: 8750 };
const PERSONAL_EXEMPTION = { single: 930, married: 1860, hoh: 930 };

const BRACKETS_SINGLE: StateTaxBracket[] = [
    { from: 0, to: 3000, rate: 0.02 },
    { from: 3000, to: 5000, rate: 0.03 },
    { from: 5000, to: 17000, rate: 0.05 },
    { from: 17000, to: null, rate: 0.0575 },
];

const BRACKETS_MARRIED: StateTaxBracket[] = [
    { from: 0, to: 3000, rate: 0.02 },
    { from: 3000, to: 5000, rate: 0.03 },
    { from: 5000, to: 17000, rate: 0.05 },
    { from: 17000, to: null, rate: 0.0575 },
];

export function estimateVirginiaStateTax(params: StateTaxEstimateInput): StateTaxAnnualParts {
  const wages = wagesAfterPretax(params);
  const taxable = stateTaxableIncome(
    wages,
    params.filingStatus,
    STANDARD_DEDUCTION,
    PERSONAL_EXEMPTION,
  );
  const brackets = filingKey(params.filingStatus) === "married" ? BRACKETS_MARRIED : BRACKETS_SINGLE;
  const income = graduatedStateIncomeTax(taxable, brackets);
  return parts("VA", income);
}
